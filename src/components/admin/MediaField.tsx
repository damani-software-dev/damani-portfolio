import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { ImagePlus, Loader2, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Media } from "@/lib/blocks";
import { signedUrlQuery, uploadMedia } from "@/lib/admin-api";

export function MediaThumb({ path, className }: { path: string; className?: string }) {
  const { data: url, isLoading } = useQuery(signedUrlQuery(path));
  if (!path) return null;
  if (isLoading) return <div className={`animate-pulse bg-secondary ${className}`} />;
  if (!url) return <div className={`flex items-center justify-center bg-secondary text-xs text-muted-foreground ${className}`}>Missing image</div>;
  return <img src={url} alt="" className={`object-contain ${className}`} />;
}

export function MediaField({
  value,
  onChange,
  folder,
  showCaption = true,
  label,
}: {
  value: Media;
  onChange: (m: Media) => void;
  folder: string;
  showCaption?: boolean;
  label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const path = await uploadMedia(folder, file);
      onChange({ ...value, path, alt: value.alt || "" });
      toast.success("Image uploaded. Save to keep it.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      {label && <p className="text-xs font-medium text-muted-foreground">{label}</p>}
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      {value.path ? (
        <div className="relative border border-border bg-surface">
          <MediaThumb path={value.path} className="max-h-72 w-full" />
          <div className="absolute right-2 top-2 flex gap-1">
            <Button type="button" size="sm" variant="secondary" onClick={() => input.current?.click()} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <RefreshCw />} Replace
            </Button>
            <Button type="button" size="sm" variant="secondary" aria-label="Remove image" onClick={() => onChange({ path: "", alt: "", caption: "" })}>
              <X />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="flex h-36 w-full flex-col items-center justify-center gap-2 border border-dashed border-input bg-surface text-sm text-muted-foreground hover:border-primary hover:text-primary"
        >
          {busy ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
          {busy ? "Uploading…" : "Upload image (max 10 MB)"}
        </button>
      )}
      {value.path && (
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            placeholder="Alt text (describe the image)"
            aria-label="Alt text"
            value={value.alt}
            onChange={(e) => onChange({ ...value, alt: e.target.value })}
          />
          {showCaption && (
            <Input
              placeholder="Caption / annotation (optional)"
              aria-label="Caption"
              value={value.caption}
              onChange={(e) => onChange({ ...value, caption: e.target.value })}
            />
          )}
        </div>
      )}
    </div>
  );
}
