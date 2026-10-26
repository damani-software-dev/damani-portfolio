import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import { profileLinks } from "@/components/site/SiteChrome";
import { settingsQuery } from "@/lib/queries";

export const Route = createFileRoute("/_site/contact")({
  loader: ({ context }) => context.queryClient.ensureQueryData(settingsQuery),
  head: ({ loaderData }) => {
    const title = `Contact — ${loaderData?.display_name || "Damani Beckford"}`;
    const desc = "Get in touch about Product Designer and UX roles.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: Contact,
});

function Contact() {
  const { data: s } = useSuspenseQuery(settingsQuery);
  const links = profileLinks(s);
  return (
    <div className="container-page pt-20 md:pt-28">
      <p className="eyebrow">Contact</p>
      <h1 className="display mt-4 max-w-4xl text-5xl md:text-7xl">Open to Product Designer roles and good conversations.</h1>
      <div className="mt-16 grid gap-px border border-border bg-border md:grid-cols-2">
        {s?.contact_email && (
          <a href={`mailto:${s.contact_email}`} className="group bg-background p-8 hover:bg-surface md:p-10">
            <span className="eyebrow">Email</span>
            <span className="mt-3 flex items-center gap-2 text-xl md:text-2xl">
              {s.contact_email}
              <ArrowUpRight className="size-5 text-muted-foreground group-hover:text-primary" />
            </span>
          </a>
        )}
        {s?.resume_href && (
          <a href={s.resume_href} target="_blank" rel="noreferrer" className="group bg-background p-8 hover:bg-surface md:p-10">
            <span className="eyebrow">Résumé</span>
            <span className="mt-3 flex items-center gap-2 text-xl md:text-2xl">
              Download PDF <ArrowUpRight className="size-5 text-muted-foreground group-hover:text-primary" />
            </span>
          </a>
        )}
        {links.map((l) => (
          <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="group bg-background p-8 hover:bg-surface md:p-10">
            <span className="eyebrow">{l.label}</span>
            <span className="mt-3 flex items-center gap-2 truncate text-xl md:text-2xl">
              {l.href.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
              <ArrowUpRight className="size-5 shrink-0 text-muted-foreground group-hover:text-primary" />
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
