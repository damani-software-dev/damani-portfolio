import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Copy, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminProjectsQuery, deleteProject, duplicateProject, normalizeOrder } from "@/lib/admin-api";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

export const Route = createFileRoute("/admin/projects/")({ component: ProjectList });

type Sort = "order" | "updated" | "title";

function ProjectList() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery(adminProjectsQuery);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "published" | "draft">("all");
  const [sort, setSort] = useState<Sort>("order");

  const ordered = data ?? [];
  const rows = useMemo(() => {
    let r = ordered.filter(
      (p) =>
        (status === "all" || (status === "published") === p.published) &&
        (p.title + " " + p.slug).toLowerCase().includes(q.toLowerCase()),
    );
    if (sort === "updated") r = [...r].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    if (sort === "title") r = [...r].sort((a, b) => a.title.localeCompare(b.title));
    return r;
  }, [ordered, q, status, sort]);
  const canReorder = sort === "order" && !q && status === "all";

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin"] });
  const move = useMutation({
    mutationFn: async ({ index, dir }: { index: number; dir: -1 | 1 }) => {
      const ids = ordered.map((p) => p.id);
      const j = index + dir;
      [ids[index], ids[j]] = [ids[j]!, ids[index]!];
      await normalizeOrder(ids);
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });
  const dup = useMutation({
    mutationFn: duplicateProject,
    onSuccess: (id) => {
      toast.success("Duplicated as a draft.");
      refresh();
      navigate({ to: "/admin/projects/$id/edit", params: { id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      toast.success("Case study deleted.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="display text-4xl">Case studies</h1>
        <Button asChild><Link to="/admin/projects/new"><Plus /> New case study</Link></Button>
      </div>
      <div className="flex flex-wrap gap-3">
        <Input placeholder="Search title or slug…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs bg-background" aria-label="Search" />
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-40 bg-background" aria-label="Filter by status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Drafts</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
          <SelectTrigger className="w-44 bg-background" aria-label="Sort"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="order">Display order</SelectItem>
            <SelectItem value="updated">Last updated</SelectItem>
            <SelectItem value="title">Title A–Z</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {!canReorder && <p className="text-xs text-muted-foreground">Clear search and filters and sort by display order to reorder.</p>}
      {error && <p role="alert" className="text-sm text-destructive">{(error as Error).message}</p>}

      <div className="overflow-x-auto border border-border bg-background">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Updated</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && <tr><td colSpan={5} className="px-4 py-8 text-muted-foreground">Loading…</td></tr>}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-muted-foreground">No case studies match.</td></tr>
            )}
            {rows.map((p) => {
              const index = ordered.findIndex((o) => o.id === p.id);
              return (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="w-6 font-mono text-xs text-muted-foreground">{index + 1}</span>
                      <Button variant="ghost" size="icon" className="size-7" aria-label={`Move ${p.title} up`} disabled={!canReorder || index === 0 || move.isPending} onClick={() => move.mutate({ index, dir: -1 })}><ArrowUp /></Button>
                      <Button variant="ghost" size="icon" className="size-7" aria-label={`Move ${p.title} down`} disabled={!canReorder || index === ordered.length - 1 || move.isPending} onClick={() => move.mutate({ index, dir: 1 })}><ArrowDown /></Button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link to="/admin/projects/$id/edit" params={{ id: p.id }} className="font-medium hover:text-primary">{p.title}</Link>
                    <p className="font-mono text-xs text-muted-foreground">/work/{p.slug}</p>
                  </td>
                  <td className="px-4 py-3"><StatusBadge published={p.published} featured={p.featured} /></td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{new Date(p.updated_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button asChild variant="ghost" size="icon" className="size-8" aria-label={`Edit ${p.title}`}>
                        <Link to="/admin/projects/$id/edit" params={{ id: p.id }}><Pencil /></Link>
                      </Button>
                      <Button asChild variant="ghost" size="icon" className="size-8" aria-label={`Preview ${p.title}`}>
                        <Link to="/admin/preview/$id" params={{ id: p.id }} target="_blank"><Eye /></Link>
                      </Button>
                      <Button variant="ghost" size="icon" className="size-8" aria-label={`Duplicate ${p.title}`} disabled={dup.isPending} onClick={() => dup.mutate(p.id)}><Copy /></Button>
                      <ConfirmDialog
                        title={`Delete “${p.title}”?`}
                        description="This permanently removes the case study, its content blocks and uploaded media. This cannot be undone."
                        onConfirm={() => del.mutate(p.id)}
                        trigger={<Button variant="ghost" size="icon" className="size-8 text-destructive" aria-label={`Delete ${p.title}`}><Trash2 /></Button>}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
