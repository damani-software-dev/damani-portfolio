import { createFileRoute, Link, useBlocker } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Eye, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminProjectQuery, saveBlocks, updateProject } from "@/lib/admin-api";
import { SLUG_RE, publishProblems, slugify, type Block, type Media } from "@/lib/blocks";
import { parseMedia } from "@/lib/content";
import type { ProjectRow } from "@/lib/types";
import { BlockList } from "@/components/admin/BlockEditor";
import { MediaField } from "@/components/admin/MediaField";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const Route = createFileRoute("/admin/projects/$id/edit")({ component: EditProject });

interface FormState {
  title: string;
  slug: string;
  subtitle: string;
  summary: string;
  category: string;
  role: string;
  team: string;
  timeline: string;
  project_status: string;
  live_url: string;
  prototype_url: string;
  seo_title: string;
  seo_description: string;
  featured: boolean;
  cover: Media;
}

const toForm = (p: ProjectRow): FormState => ({
  title: p.title,
  slug: p.slug,
  subtitle: p.subtitle ?? "",
  summary: p.summary ?? "",
  category: p.category ?? "",
  role: p.role ?? "",
  team: p.team ?? "",
  timeline: p.timeline ?? "",
  project_status: p.project_status ?? "",
  live_url: p.live_url ?? "",
  prototype_url: p.prototype_url ?? "",
  seo_title: p.seo_title ?? "",
  seo_description: p.seo_description ?? "",
  featured: p.featured,
  cover: parseMedia(p.cover_image) ?? { path: "", alt: "", caption: "" },
});

const nul = (s: string) => (s.trim() ? s.trim() : null);
const isUrl = (s: string) => !s || /^https:\/\/\S+$/.test(s);

function EditProject() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery(adminProjectQuery(id));
  const [form, setForm] = useState<FormState | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [baseline, setBaseline] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (data && !form) {
      const f = toForm(data.project);
      setForm(f);
      setBlocks(data.blocks);
      setBaseline(JSON.stringify([f, data.blocks]));
    }
  }, [data, form]);

  const dirty = useMemo(() => !!form && JSON.stringify([form, blocks]) !== baseline, [form, blocks, baseline]);

  useBlocker({
    shouldBlockFn: () => (dirty ? !window.confirm("You have unsaved changes. Leave without saving?") : false),
    enableBeforeUnload: () => dirty,
  });

  if (isLoading || (!form && !error)) return <p className="text-muted-foreground">Loading…</p>;
  if (error || !data || !form) return <p role="alert" className="text-destructive">{(error as Error)?.message ?? "Not found."}</p>;

  const published = data.project.published;
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm({ ...form, [k]: v });

  function validate(publishing: boolean) {
    const out: string[] = [];
    if (!form!.title.trim()) out.push("Title is required.");
    if (!SLUG_RE.test(form!.slug)) out.push("Slug may contain lowercase letters, numbers and single hyphens.");
    if (!isUrl(form!.live_url) || !isUrl(form!.prototype_url)) out.push("Links must start with https://");
    if (form!.cover.path && !form!.cover.alt.trim()) out.push("Add alt text for the cover image.");
    if (publishing) out.push(...publishProblems({ title: form!.title, slug: form!.slug, summary: form!.summary, blocks }));
    return [...new Set(out)];
  }

  async function save(nextPublished: boolean = published) {
    const problems = validate(nextPublished);
    setErrors(problems);
    if (problems.length) {
      toast.error(problems[0]);
      return;
    }
    setSaving(true);
    try {
      // Save content first so a publish never exposes a half-saved case study.
      await saveBlocks(id, blocks);
      await updateProject(id, {
        title: form!.title.trim(),
        slug: form!.slug,
        subtitle: nul(form!.subtitle),
        summary: nul(form!.summary),
        category: nul(form!.category),
        role: nul(form!.role),
        team: nul(form!.team),
        timeline: nul(form!.timeline),
        project_status: nul(form!.project_status),
        live_url: nul(form!.live_url),
        prototype_url: nul(form!.prototype_url),
        seo_title: nul(form!.seo_title),
        seo_description: nul(form!.seo_description),
        cover_image: form!.cover.path ? { path: form!.cover.path, alt: form!.cover.alt, caption: form!.cover.caption } : null,
        published: nextPublished,
        featured: nextPublished && form!.featured,
      });
      const f = { ...form!, featured: nextPublished && form!.featured };
      setForm(f);
      setBaseline(JSON.stringify([f, blocks]));
      await qc.invalidateQueries({ queryKey: ["admin"] });
      await qc.invalidateQueries({ queryKey: ["public"] });
      toast.success(nextPublished !== published ? (nextPublished ? "Published." : "Unpublished — now a private draft.") : "Saved.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const folder = `projects/${id}`;
  const field = (k: keyof FormState, label: string, opts: { area?: boolean; hint?: string; placeholder?: string } = {}) => (
    <div className="space-y-2">
      <Label htmlFor={k}>{label}</Label>
      {opts.area ? (
        <Textarea id={k} rows={3} value={form[k] as string} placeholder={opts.placeholder} onChange={(e) => set(k, e.target.value as never)} />
      ) : (
        <Input id={k} value={form[k] as string} placeholder={opts.placeholder} onChange={(e) => set(k, e.target.value as never)} />
      )}
      {opts.hint && <p className="text-xs text-muted-foreground">{opts.hint}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <Link to="/admin/projects" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Case studies
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="display truncate text-4xl">{form.title || "Untitled"}</h1>
            <StatusBadge published={published} featured={data.project.featured} />
            {dirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/admin/preview/$id" params={{ id }} target="_blank"><Eye /> Preview</Link>
          </Button>
          <Button onClick={() => save()} disabled={saving || !dirty}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />} {published ? "Save changes" : "Save draft"}
          </Button>
        </div>
      </div>

      {errors.length > 0 && (
        <ul role="alert" className="space-y-1 border border-destructive/30 bg-background p-4 text-sm text-destructive">
          {errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}

      <Tabs defaultValue="basics">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="basics">Basics</TabsTrigger>
          <TabsTrigger value="overview">Overview & metadata</TabsTrigger>
          <TabsTrigger value="content">Content ({blocks.length})</TabsTrigger>
          <TabsTrigger value="media">Cover image</TabsTrigger>
          <TabsTrigger value="seo">SEO & sharing</TabsTrigger>
          <TabsTrigger value="publish">Publishing</TabsTrigger>
        </TabsList>

        <TabsContent value="basics" className="mt-6 max-w-3xl space-y-5 border border-border bg-background p-6">
          {field("title", "Title")}
          <div className="space-y-2">
            <Label htmlFor="slug">URL slug</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/work/</span>
              <Input id="slug" value={form.slug} onChange={(e) => set("slug", e.target.value.toLowerCase())} aria-invalid={!SLUG_RE.test(form.slug)} />
              <Button type="button" variant="outline" size="sm" onClick={() => set("slug", slugify(form.title))}>From title</Button>
            </div>
            {published && form.slug !== data.project.slug && (
              <p className="text-xs text-destructive">Changing the slug of a published project breaks links already shared.</p>
            )}
          </div>
          {field("subtitle", "Subtitle")}
          {field("summary", "Short summary", { area: true, hint: "Shown on the homepage card and as the case-study lead." })}
        </TabsContent>

        <TabsContent value="overview" className="mt-6 grid max-w-3xl gap-5 border border-border bg-background p-6 sm:grid-cols-2">
          {field("category", "Category", { placeholder: "e.g. Logistics platform" })}
          {field("role", "My role", { placeholder: "e.g. Lead Product Designer" })}
          {field("timeline", "Timeline", { placeholder: "e.g. 2023 · 6 months" })}
          {field("project_status", "Project status", { placeholder: "e.g. Shipped, In development" })}
          <div className="sm:col-span-2">{field("team", "Team & collaboration", { area: true })}</div>
          {field("live_url", "Live product URL", { placeholder: "https://" })}
          {field("prototype_url", "Prototype URL", { placeholder: "https://" })}
        </TabsContent>

        <TabsContent value="content" className="mt-6 max-w-4xl">
          <BlockList blocks={blocks} onChange={setBlocks} folder={folder} />
        </TabsContent>

        <TabsContent value="media" className="mt-6 max-w-3xl border border-border bg-background p-6">
          <MediaField label="Cover image (also used for social sharing)" value={form.cover} onChange={(m) => set("cover", m)} folder={folder} showCaption={false} />
        </TabsContent>

        <TabsContent value="seo" className="mt-6 max-w-3xl space-y-5 border border-border bg-background p-6">
          {field("seo_title", "SEO title", { hint: `Defaults to “${form.title} — Case study”. ${form.seo_title.length}/60` })}
          {field("seo_description", "SEO description", { area: true, hint: `Defaults to the summary. ${form.seo_description.length}/160` })}
        </TabsContent>

        <TabsContent value="publish" className="mt-6 max-w-3xl space-y-6 border border-border bg-background p-6">
          <div>
            <p className="font-medium">{published ? "This case study is live." : "This case study is a private draft."}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {published
                ? "Saving keeps it published. Unpublishing removes it from the site immediately."
                : "Publishing requires a title, valid slug, summary and at least one content block."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Switch id="featured" checked={form.featured} disabled={!published} onCheckedChange={(v) => set("featured", v)} />
            <Label htmlFor="featured">Feature on homepage{!published && " (publish first)"}</Label>
          </div>
          <div className="flex gap-2">
            {published ? (
              <Button variant="outline" disabled={saving} onClick={() => { if (confirm("Unpublish? It will no longer be publicly visible.")) save(false); }}>
                Unpublish
              </Button>
            ) : (
              <Button disabled={saving} onClick={() => save(true)}>Save & publish</Button>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
