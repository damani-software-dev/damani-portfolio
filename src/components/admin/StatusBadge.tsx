import { cn } from "@/lib/utils";

export function StatusBadge({ published, featured }: { published: boolean; featured?: boolean }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-2 text-xs">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 border px-2 py-0.5",
          published ? "border-success/30 text-success" : "border-border text-muted-foreground",
        )}
      >
        <span className={cn("size-1.5 rounded-full", published ? "bg-success" : "bg-muted-foreground/50")} />
        {published ? "Published" : "Draft"}
      </span>
      {featured && <span className="border border-primary/30 px-2 py-0.5 text-primary">Featured</span>}
    </span>
  );
}
