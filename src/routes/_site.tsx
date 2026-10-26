import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { SiteFooter, SiteHeader } from "@/components/site/SiteChrome";
import { settingsQuery } from "@/lib/queries";

export const Route = createFileRoute("/_site")({
  loader: ({ context }) => context.queryClient.ensureQueryData(settingsQuery),
  component: SiteLayout,
});

function SiteLayout() {
  const { data: settings } = useSuspenseQuery(settingsQuery);
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader settings={settings} />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <SiteFooter settings={settings} />
    </div>
  );
}
