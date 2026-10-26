import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { RichText } from "@/components/site/RichText";
import { profileLinks } from "@/components/site/SiteChrome";
import { settingsQuery } from "@/lib/queries";

export const Route = createFileRoute("/_site/about")({
  loader: ({ context }) => context.queryClient.ensureQueryData(settingsQuery),
  head: ({ loaderData }) => {
    const title = `About — ${loaderData?.display_name || "Damani Beckford"}`;
    const desc = "Background, design philosophy, software development experience, skills and tools.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "profile" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: About,
});

function Section({ label, text }: { label: string; text: string | null }) {
  if (!text?.trim()) return null;
  return (
    <section className="grid gap-6 border-t border-border py-12 md:grid-cols-12">
      <h2 className="eyebrow md:col-span-4">{label}</h2>
      <RichText text={text} className="text-lg leading-relaxed text-foreground/85 md:col-span-8" />
    </section>
  );
}

function List({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="eyebrow">{label}</h3>
      <ul className="mt-4 space-y-2">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}

function About() {
  const { data: s } = useSuspenseQuery(settingsQuery);
  const links = profileLinks(s);
  return (
    <div className="container-page pt-20 md:pt-28">
      <p className="eyebrow">About</p>
      <h1 className="display mt-4 max-w-4xl text-5xl md:text-7xl">{s?.display_name}</h1>
      {s?.about_intro ? (
        <RichText text={s.about_intro} className="display mt-10 max-w-3xl text-3xl leading-snug" />
      ) : (
        <p className="mt-10 text-muted-foreground">More about my background is coming soon.</p>
      )}
      <div className="mt-16">
        <Section label="Design philosophy" text={s?.about_philosophy ?? null} />
        <Section label="Background" text={s?.about_background ?? null} />
        <Section label="Software development" text={s?.about_dev_experience ?? null} />
        {(s?.skills.length || s?.tools.length) ? (
          <section className="grid gap-6 border-t border-border py-12 md:grid-cols-12">
            <h2 className="eyebrow md:col-span-4">Skills & tools</h2>
            <div className="grid gap-10 sm:grid-cols-2 md:col-span-8">
              <List label="Skills" items={s?.skills ?? []} />
              <List label="Tools" items={s?.tools ?? []} />
            </div>
          </section>
        ) : null}
        {(links.length > 0 || s?.resume_href) && (
          <section className="grid gap-6 border-t border-border py-12 md:grid-cols-12">
            <h2 className="eyebrow md:col-span-4">Elsewhere</h2>
            <ul className="flex flex-wrap gap-x-8 gap-y-3 md:col-span-8">
              {s?.resume_href && (
                <li><a className="link-underline text-primary" href={s.resume_href} target="_blank" rel="noreferrer">Résumé</a></li>
              )}
              {links.map((l) => (
                <li key={l.label}><a className="link-underline" href={l.href} target="_blank" rel="noreferrer">{l.label}</a></li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
