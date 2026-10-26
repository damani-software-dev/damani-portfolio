import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { applyUrls, collectPaths, isBlockType, mediaSchema, parseContent, type Block, type Media } from "./blocks";
import type { CaseStudy, CaseStudyPage, ProjectCard, ProjectRow, SectionRow } from "./types";

type Client = SupabaseClient<Database>;
export const MEDIA_BUCKET = "portfolio-media";
const SIGN_SECONDS = 60 * 60 * 24 * 7;

export function parseMedia(raw: unknown): Media | null {
  const r = mediaSchema.safeParse(raw);
  return r.success && r.data.path ? r.data : null;
}

export function rowsToBlocks(rows: SectionRow[]): Block[] {
  return rows
    .filter((r) => isBlockType(r.section_type))
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((r) => {
      const t = r.section_type as Block["section_type"];
      return { id: r.id, section_type: t, title: r.title ?? "", content: parseContent(t, r.content) };
    });
}

/** Sign storage paths. `rewriteOrigin` maps a server-internal URL to a browser-reachable one. */
export async function signPaths(
  client: Client,
  paths: string[],
  rewrite?: (u: string) => string,
): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return {};
  const { data, error } = await client.storage.from(MEDIA_BUCKET).createSignedUrls(unique, SIGN_SECONDS);
  if (error || !data) return {};
  const out: Record<string, string> = {};
  for (const d of data) if (d.path && d.signedUrl) out[d.path] = rewrite ? rewrite(d.signedUrl) : d.signedUrl;
  return out;
}

export function toCard(p: ProjectRow, urls: Record<string, string>): ProjectCard {
  const cover = parseMedia(p.cover_image);
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    subtitle: p.subtitle,
    summary: p.summary,
    category: p.category,
    role: p.role,
    featured: p.featured,
    cover: cover ? { ...cover, url: urls[cover.path] } : null,
  };
}

const CARD_COLS = "*";

export async function fetchPublishedCards(client: Client, rewrite?: (u: string) => string) {
  const { data, error } = await client
    .from("projects")
    .select(CARD_COLS)
    .eq("published", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  const urls = await signPaths(client, data.map((p) => parseMedia(p.cover_image)?.path ?? ""), rewrite);
  return data.map((p) => toCard(p, urls));
}

export async function buildCaseStudy(
  client: Client,
  project: ProjectRow,
  rewrite?: (u: string) => string,
): Promise<CaseStudy> {
  const { data: rows, error } = await client.from("project_sections").select("*").eq("project_id", project.id);
  if (error) throw new Error(error.message);
  const blocks = rowsToBlocks(rows);
  const cover = parseMedia(project.cover_image);
  const urls = await signPaths(client, [...collectPaths(blocks), cover?.path ?? ""], rewrite);
  return {
    ...toCard(project, urls),
    team: project.team,
    timeline: project.timeline,
    project_status: project.project_status,
    live_url: project.live_url,
    prototype_url: project.prototype_url,
    seo_title: project.seo_title,
    seo_description: project.seo_description,
    published: project.published,
    blocks: applyUrls(blocks, urls),
  };
}

export async function fetchCaseStudyPage(
  client: Client,
  slug: string,
  rewrite?: (u: string) => string,
): Promise<CaseStudyPage | null> {
  const { data: project, error } = await client
    .from("projects")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!project) return null;
  const [cs, cards] = await Promise.all([
    buildCaseStudy(client, project, rewrite),
    fetchPublishedCards(client, rewrite),
  ]);
  const idx = cards.findIndex((c) => c.id === project.id);
  const prev = idx > 0 ? (cards[idx - 1] ?? null) : null;
  const next = idx >= 0 && idx < cards.length - 1 ? (cards[idx + 1] ?? null) : null;
  const related = cards
    .filter((c) => c.id !== project.id && c.id !== prev?.id && c.id !== next?.id)
    .sort((a, b) => Number(b.category === project.category) - Number(a.category === project.category))
    .slice(0, 2);
  return { project: cs, prev, next, related };
}
