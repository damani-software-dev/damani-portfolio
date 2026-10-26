import { createFileRoute, useBlocker } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Loader2, Save, Upload } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { adminSettingsQuery, updateSettings, uploadMedia } from "@/lib/admin-api";
import type { SettingsRow } from "@/lib/types";

export const Route = createFileRoute("/admin/settings")({ component: Settings });

const TEXT_KEYS = [
  "display_name", "hero_headline", "hero_intro", "approach_text", "dev_background_text",
  "about_intro", "about_philosophy", "about_background", "about_dev_experience",
  "contact_email", "linkedin_url", "github_url", "dribbble_url", "other_url",
  "resume_url", "footer_text", "seo_title", "seo_description",
] as const;
type Key = (typeof TEXT_KEYS)[number];
type Form = Record<Key, string> & { skills: string; tools: string };

const url = z.string().url().startsWith("https://").or(z.literal(""));
const schema = z.object({
  display_name: z.string().trim().min(1, "Display name is required."),
  contact_email: z.string().trim().email("Contact email is invalid.").or(z.literal("")),
  linkedin_url: url, github_url: url, dribbble_url: url, other_url: url,
});

function toForm(s: SettingsRow): Form {
  const f = Object.fromEntries(TEXT_KEYS.map((k) => [k, (s[k] as string | null) ?? ""])) as Form;
  f.skills = s.skills.join("\n");
  f.tools = s.tools.join("\n");
  return f;
}

function Settings() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery(adminSettingsQuery);
  const [form, setForm] = useState<Form | null>(null);
  const [baseline, setBaseline] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (data && !form) {
      const f = toForm(data);
      setForm(f);
      setBaseline(JSON.stringify(f));
    }
  }, [data, form]);
  const dirty = useMemo(() => !!form && JSON.stringify(form) !== baseline, [form, baseline]);
  useBlocker({
    shouldBlockFn: () => (dirty ? !window.confirm("Discard unsaved settings?") : false),
    enableBeforeUnload: () => dirty,
  });

  if (isLoading || (!form && !error)) return <p className="text-muted-foreground">Loading…</p>;
  if (error || !form) return <p role="alert" className="text-destructive">{(error as Error)?.message ?? "Settings missing."}</p>;

  const set = (k: keyof Form, v: string) => setForm({ ...form, [k]: v });

  async function save() {
    const r = schema.safeParse(form);
    if (!r.success) {
      toast.error(r.error.issues[0]?.message ?? "Please check the form.");
      return;
    }
    setSaving(true);
    try {
      const patch = Object.fromEntries(TEXT_KEYS.map((k) => [k, form![k].trim() || null]));
      await updateSettings({
        ...patch,
        display_name: form!.display_name.trim(),
        skills: form!.skills.split("\n").map((s) => s.trim()).filter(Boolean),
        tools: form!.tools.split("\n").map((s) => s.trim()).filter(Boolean),
      });
      setBaseline(JSON.stringify(form));
      await qc.invalidateQueries({ queryKey: ["public"] });
      await qc.invalidateQueries({ queryKey: ["admin", "settings"] });
      toast.success("Settings saved.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function onResume(file?: File) {
    if (!file) return;
    setUploading(true);
    try {
      const path = await uploadMedia("site", file, "pdf");
      set("resume_url", path);
      toast.success("Résumé uploaded. Save to apply.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  const F = ({ k, label, area, rows = 4, hint }: { k: keyof Form; label: string; area?: boolean; rows?: number; hint?: string }) => (
    <div className="space-y-2">
      <Label htmlFor={k}>{label}</Label>
      {area ? (
        <Textarea id={k} rows={rows} value={form[k]} onChange={(e) => set(k, e.target.value)} />
      ) : (
        <Input id={k} value={form[k]} onChange={(e) => set(k, e.target.value)} />
      )}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );

  const group = (title: string, children: ReactNode) => (
    <section className="space-y-5 border border-border bg-background p-6">
      <h2 className="text-sm font-medium">{title}</h2>
      {children}
    </section>
  );

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="display text-4xl">Site settings</h1>
        <Button onClick={save} disabled={saving || !dirty}>{saving ? <Loader2 className="animate-spin" /> : <Save />} Save</Button>
      </div>
      {group("Identity & homepage", <>
        {F({ k: "display_name", label: "Display name" })}
        {F({ k: "hero_headline", label: "Hero headline" })}
        {F({ k: "hero_intro", label: "Hero introduction", area: true, hint: "Your approach to user needs, business goals and technical realities." })}
        {F({ k: "approach_text", label: "Product design approach", area: true })}
        {F({ k: "dev_background_text", label: "How development strengthens your design", area: true })}
      </>)}
      {group("About page", <>
        {F({ k: "about_intro", label: "Professional introduction", area: true })}
        {F({ k: "about_philosophy", label: "Design philosophy", area: true })}
        {F({ k: "about_background", label: "Professional background", area: true })}
        {F({ k: "about_dev_experience", label: "Software development experience", area: true })}
        <div className="grid gap-5 sm:grid-cols-2">
          {F({ k: "skills", label: "Skills (one per line)", area: true, rows: 6 })}
          {F({ k: "tools", label: "Tools (one per line)", area: true, rows: 6 })}
        </div>
      </>)}
      {group("Contact & profiles", <>
        {F({ k: "contact_email", label: "Contact email" })}
        <div className="grid gap-5 sm:grid-cols-2">
          {F({ k: "linkedin_url", label: "LinkedIn URL" })}
          {F({ k: "github_url", label: "GitHub URL" })}
          {F({ k: "dribbble_url", label: "Dribbble / Behance URL" })}
          {F({ k: "other_url", label: "Other website" })}
        </div>
        <div className="space-y-2">
          <Label htmlFor="resume_url">Résumé</Label>
          <div className="flex gap-2">
            <Input id="resume_url" value={form.resume_url} onChange={(e) => set("resume_url", e.target.value)} placeholder="Upload a PDF or paste an https:// link" />
            <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => onResume(e.target.files?.[0])} />
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="animate-spin" /> : <Upload />} PDF
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">The résumé link appears in navigation only when set.</p>
        </div>
      </>)}
      {group("Footer & SEO defaults", <>
        {F({ k: "footer_text", label: "Footer text" })}
        {F({ k: "seo_title", label: "Default SEO title" })}
        {F({ k: "seo_description", label: "Default SEO description", area: true, rows: 2 })}
      </>)}
    </div>
  );
}
