/**
 * Admin data access. Runs in the browser as the signed-in user; every write is
 * enforced server-side by RLS policies requiring the admin role.
 */
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { collectPaths, type Block } from "./blocks";
import { MEDIA_BUCKET, buildCaseStudy, parseMedia, rowsToBlocks, signPaths } from "./content";

function fail(error: { message: string; code?: string } | null): never | void {
  if (!error) return;
  if (error.code === "23505") throw new Error("That URL slug is already used by another project.");
  if (error.code === "42501") throw new Error("You don’t have permission to do that.");
  throw new Error(error.message);
}

export const adminProjectsQuery = queryOptions({
  queryKey: ["admin", "projects"],
  queryFn: async () => {
    const { data, error } = await supabase.from("projects").select("*").order("sort_order");
    fail(error);
    return data ?? [];
  },
});

export const adminProjectQuery = (id: string) =>
  queryOptions({
    queryKey: ["admin", "project", id],
    queryFn: async () => {
      const [{ data: project, error }, { data: rows, error: e2 }] = await Promise.all([
        supabase.from("projects").select("*").eq("id", id).maybeSingle(),
        supabase.from("project_sections").select("*").eq("project_id", id),
      ]);
      fail(error);
      fail(e2);
      if (!project) throw new Error("Project not found.");
      return { project, blocks: rowsToBlocks(rows ?? []) };
    },
  });

export const adminPreviewQuery = (id: string) =>
  queryOptions({
    queryKey: ["admin", "preview", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
      fail(error);
      if (!data) throw new Error("Project not found.");
      return buildCaseStudy(supabase, data);
    },
  });

export const adminSettingsQuery = queryOptions({
  queryKey: ["admin", "settings"],
  queryFn: async () => {
    const { data, error } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
    fail(error);
    return data;
  },
});

export const signedUrlQuery = (path: string) =>
  queryOptions({
    queryKey: ["admin", "signed", path],
    queryFn: async () => (await signPaths(supabase, [path]))[path] ?? null,
    staleTime: 1000 * 60 * 60,
    enabled: !!path,
  });

export async function createProject(input: { title: string; slug: string }) {
  const { data: last } = await supabase.from("projects").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  const { data, error } = await supabase
    .from("projects")
    .insert({ title: input.title, slug: input.slug, sort_order: (last?.[0]?.sort_order ?? -1) + 1 })
    .select("id")
    .single();
  fail(error);
  return data!.id;
}

export async function updateProject(id: string, patch: TablesUpdate<"projects">) {
  const { error } = await supabase.from("projects").update(patch).eq("id", id);
  fail(error);
}

/** Persist the full ordered block list: upsert present blocks, delete removed ones. */
export async function saveBlocks(projectId: string, blocks: Block[]) {
  const rows: TablesInsert<"project_sections">[] = blocks.map((b, i) => ({
    id: b.id,
    project_id: projectId,
    section_type: b.section_type,
    title: b.title || null,
    content: stripUrls(b.content) as Json,
    sort_order: i,
  }));
  if (rows.length) {
    const { error } = await supabase.from("project_sections").upsert(rows);
    fail(error);
  }
  const keep = blocks.map((b) => b.id);
  let del = supabase.from("project_sections").delete().eq("project_id", projectId);
  if (keep.length) del = del.not("id", "in", `(${keep.join(",")})`);
  const { error } = await del;
  fail(error);
}

/** Signed URLs are derived at read time; never persist them. */
function stripUrls(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(stripUrls);
  if (v && typeof v === "object") {
    const o: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v)) if (k !== "url") o[k] = stripUrls(val);
    return o;
  }
  return v;
}

export async function duplicateProject(id: string) {
  const { data: p, error } = await supabase.from("projects").select("*").eq("id", id).single();
  fail(error);
  const { data: rows, error: e2 } = await supabase.from("project_sections").select("*").eq("project_id", id);
  fail(e2);
  const { data: all } = await supabase.from("projects").select("slug, sort_order");
  const slugs = new Set((all ?? []).map((r) => r.slug));
  let slug = `${p!.slug}-copy`;
  for (let n = 2; slugs.has(slug); n++) slug = `${p!.slug}-copy-${n}`;
  const maxOrder = Math.max(-1, ...(all ?? []).map((r) => r.sort_order));
  const { id: _id, created_at: _c, updated_at: _u, published_at: _pa, ...rest } = p!;
  const { data: copy, error: e3 } = await supabase
    .from("projects")
    .insert({ ...rest, title: `${p!.title} (copy)`, slug, published: false, featured: false, sort_order: maxOrder + 1 })
    .select("id")
    .single();
  fail(e3);
  if (rows?.length) {
    const { error: e4 } = await supabase.from("project_sections").insert(
      rows.map(({ id: _i, created_at: _a, updated_at: _b, ...r }) => ({ ...r, project_id: copy!.id })),
    );
    fail(e4);
  }
  return copy!.id;
}

export async function deleteProject(id: string) {
  const { data: rows } = await supabase.from("project_sections").select("*").eq("project_id", id);
  const { data: p } = await supabase.from("projects").select("cover_image").eq("id", id).maybeSingle();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  fail(error);
  // Best-effort media cleanup after the record is gone.
  const paths = [...collectPaths(rowsToBlocks(rows ?? [])), parseMedia(p?.cover_image)?.path ?? ""].filter(Boolean);
  const { data: listed } = await supabase.storage.from(MEDIA_BUCKET).list(`projects/${id}`);
  const all = [...new Set([...paths, ...(listed ?? []).map((f) => `projects/${id}/${f.name}`)])];
  if (all.length) await supabase.storage.from(MEDIA_BUCKET).remove(all);
}

export async function swapOrder(a: { id: string; sort_order: number }, b: { id: string; sort_order: number }) {
  // Distinct values guarantee a stable order even if earlier rows share a sort_order.
  const [x, y] = a.sort_order === b.sort_order ? [a.sort_order + 1, a.sort_order] : [b.sort_order, a.sort_order];
  await updateProject(a.id, { sort_order: x });
  await updateProject(b.id, { sort_order: y });
}

export async function normalizeOrder(ids: string[]) {
  await Promise.all(ids.map((id, i) => updateProject(id, { sort_order: i })));
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/svg+xml"];
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function validateUpload(file: File, kind: "image" | "pdf" = "image"): string | null {
  const ok = kind === "pdf" ? file.type === "application/pdf" : IMAGE_TYPES.includes(file.type);
  if (!ok) return kind === "pdf" ? "Please choose a PDF file." : "Please choose a JPG, PNG, WebP, GIF, AVIF or SVG image.";
  if (file.size > MAX_UPLOAD_BYTES) return "Files must be 10 MB or smaller.";
  return null;
}

export async function uploadMedia(folder: string, file: File, kind: "image" | "pdf" = "image") {
  const problem = validateUpload(file, kind);
  if (problem) throw new Error(problem);
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: "31536000",
  });
  fail(error);
  return path;
}

export async function updateSettings(patch: TablesUpdate<"site_settings">) {
  const { error } = await supabase.from("site_settings").update(patch).eq("id", 1);
  fail(error);
}
