import { useState } from "react";
import type { Media } from "@/lib/blocks";
import { cn } from "@/lib/utils";

/** Renders media, or a quiet neutral placeholder when missing/broken — never a broken icon. */
export function SmartImage({
  media,
  className,
  fallbackLabel,
  loading = "lazy",
  sizes,
}: {
  media: Media | null | undefined;
  className?: string;
  fallbackLabel?: string;
  loading?: "eager" | "lazy";
  sizes?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!media?.url || failed) {
    return (
      <div className={cn("flex items-center justify-center bg-surface", className)} aria-hidden={!fallbackLabel}>
        {fallbackLabel && <span className="display text-2xl text-muted-foreground/60">{fallbackLabel}</span>}
      </div>
    );
  }
  return (
    <img
      src={media.url}
      alt={media.alt}
      loading={loading}
      decoding="async"
      sizes={sizes}
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
