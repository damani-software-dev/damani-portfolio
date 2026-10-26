import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink, LayoutGrid, LogOut, Settings, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/admin/login" });
    const { data: isAdmin } = await supabase.rpc("is_admin");
    return { user: data.user, isAdmin: !!isAdmin };
  },
  head: () => ({
    meta: [
      { title: "Portfolio CMS" },
      { name: "description", content: "Manage case studies and site content." },
      { property: "og:title", content: "Portfolio CMS" },
      { property: "og:description", content: "Manage case studies and site content." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

function useSignOut() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/admin/login", replace: true });
  };
}

function AdminLayout() {
  const { user, isAdmin } = Route.useRouteContext();
  const signOut = useSignOut();

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="display text-4xl">Not authorized</h1>
          <p className="mt-3 text-muted-foreground">
            {user.email} doesn’t have administrator access to this CMS.
          </p>
          <Button variant="outline" className="mt-6" onClick={signOut}>Sign out</Button>
        </div>
      </main>
    );
  }

  const nav = [
    { to: "/admin", label: "Dashboard", icon: LayoutGrid, exact: true },
    { to: "/admin/projects", label: "Case studies", icon: FileText, exact: false },
    { to: "/admin/settings", label: "Site settings", icon: Settings, exact: false },
  ] as const;

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 md:px-6">
          <Link to="/admin" className="text-sm font-semibold">CMS</Link>
          <nav aria-label="Admin" className="flex flex-1 items-center gap-1 overflow-x-auto text-sm">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: n.exact }}
                className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground data-[status=active]:bg-secondary data-[status=active]:text-foreground"
              >
                <n.icon className="size-4" />
                <span className="hidden sm:inline">{n.label}</span>
              </Link>
            ))}
          </nav>
          <a href="/" target="_blank" rel="noreferrer" className="hidden items-center gap-1 text-sm text-muted-foreground hover:text-foreground sm:inline-flex">
            View site <ExternalLink className="size-3.5" />
          </a>
          <Button variant="ghost" size="sm" onClick={signOut} aria-label="Sign out">
            <LogOut />
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <Outlet />
      </main>
    </div>
  );
}
