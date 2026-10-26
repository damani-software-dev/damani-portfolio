import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CaseStudyView } from "@/components/site/CaseStudyView";
import { adminPreviewQuery } from "@/lib/admin-api";

export const Route = createFileRoute("/admin/preview/$id")({ component: Preview });

function Preview() {
  const { id } = Route.useParams();
  const { data, isLoading, error } = useQuery(adminPreviewQuery(id));
  return (
    <div className="-mx-4 -my-8 bg-background pb-24 md:-mx-6">
      <div className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-primary/20 bg-accent px-4 py-2 text-sm text-accent-foreground">
        <span>
          Preview{data ? ` — ${data.published ? "published" : "draft, not visible to the public"}` : ""}. Reflects the last saved version.
        </span>
        <Link to="/admin/projects/$id/edit" params={{ id }} className="link-underline">Back to editor</Link>
      </div>
      {isLoading && <p className="p-8 text-muted-foreground">Loading preview…</p>}
      {error && <p role="alert" className="p-8 text-destructive">{(error as Error).message}</p>}
      {data && <CaseStudyView project={data} />}
    </div>
  );
}
