import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProject } from "@/lib/admin-api";
import { SLUG_RE, slugify } from "@/lib/blocks";

export const Route = createFileRoute("/admin/projects/new")({ component: NewProject });

function NewProject() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const effectiveSlug = touched ? slug : slugify(title);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError("Add a title.");
    if (!SLUG_RE.test(effectiveSlug)) return setError("Slug may contain lowercase letters, numbers and single hyphens.");
    setBusy(true);
    setError(null);
    try {
      const id = await createProject({ title: title.trim(), slug: effectiveSlug });
      await qc.invalidateQueries({ queryKey: ["admin"] });
      toast.success("Draft created.");
      navigate({ to: "/admin/projects/$id/edit", params: { id } });
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-6 border border-border bg-background p-8" noValidate>
      <h1 className="display text-4xl">New case study</h1>
      <p className="text-sm text-muted-foreground">It starts as a private draft. You’ll add content on the next screen.</p>
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </div>
      <div className="space-y-2">
        <Label htmlFor="slug">URL slug</Label>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">/work/</span>
          <Input id="slug" value={effectiveSlug} onChange={(e) => { setTouched(true); setSlug(e.target.value.toLowerCase()); }} />
        </div>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create draft"}</Button>
    </form>
  );
}
