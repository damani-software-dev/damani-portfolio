import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminProjectsQuery } from "@/lib/admin-api";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const Route = createFileRoute("/admin/")({ component: Dashboard });

function Dashboard() {
  const { data, isLoading, error } = useQuery(adminProjectsQuery);
  const projects = data ?? [];
  const published = projects.filter((p) => p.published).length;
  const recent = [...projects].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-4xl">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Overview of your portfolio content.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/admin/settings"><Settings /> Site settings</Link></Button>
          <Button asChild><Link to="/admin/projects/new"><Plus /> New case study</Link></Button>
        </div>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{(error as Error).message}</p>}
      <dl className="grid gap-px border border-border bg-border sm:grid-cols-3">
        {[
          ["Total case studies", projects.length],
          ["Published", published],
          ["Drafts", projects.length - published],
        ].map(([l, v]) => (
          <div key={l} className="bg-background p-6">
            <dt className="eyebrow">{l}</dt>
            <dd className="display mt-2 text-5xl">{isLoading ? "–" : v}</dd>
          </div>
        ))}
      </dl>
      <section className="border border-border bg-background">
        <h2 className="border-b border-border px-6 py-4 text-sm font-medium">Recently updated</h2>
        {recent.length === 0 && !isLoading ? (
          <p className="px-6 py-8 text-sm text-muted-foreground">No case studies yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-4 px-6 py-4">
                <div className="min-w-0">
                  <Link to="/admin/projects/$id/edit" params={{ id: p.id }} className="font-medium hover:text-primary">{p.title}</Link>
                  <p className="text-xs text-muted-foreground">Updated {new Date(p.updated_at).toLocaleString()}</p>
                </div>
                <StatusBadge published={p.published} featured={p.featured} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
