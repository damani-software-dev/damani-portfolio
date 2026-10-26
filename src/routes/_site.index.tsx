import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { ProjectPreview } from "@/components/site/ProjectPreview";
import { RichText } from "@/components/site/RichText";
import { publishedProjectsQuery, settingsQuery } from "@/lib/queries";

export const Route = createFileRoute("/_site/")({
  loader: async ({ context }) => {
    const [settings] = await Promise.all([
      context.queryClient.ensureQueryData(settingsQuery),
      context.queryClient.ensureQueryData(publishedProjectsQuery),
    ]);
    return { settings };
  },
  head: ({ loaderData }) => {
    const s = loaderData?.settings;
    const title = s?.seo_title || "Damani Beckford — Product Designer";
    const desc = s?.seo_description || "Selected product design work and case studies.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: Home,
});

function Home() {
  const { data: s } = useSuspenseQuery(settingsQuery);
  const { data: projects } = useSuspenseQuery(publishedProjectsQuery);
  const featured = projects.filter((p) => p.featured);
  const work = featured.length ? featured : projects;

  return (
    <>
      <section className="container-page pb-20 pt-20 md:pb-28 md:pt-32">
        <p className="eyebrow">{s?.display_name} — Product Designer</p>
        <h1 className="display mt-6 max-w-5xl text-[2.9rem] md:text-[5.2rem]">
          {s?.hero_headline || "Product Designer with a software development background."}
        </h1>
        {s?.hero_intro && (
          <RichText text={s.hero_intro} className="mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl" />
        )}
      </section>

      <section aria-labelledby="work" className="container-page">
        <div className="flex items-baseline justify-between border-t border-border pt-6">
          <h2 id="work" className="eyebrow">Selected work</h2>
          <span className="eyebrow">{work.length} {work.length === 1 ? "project" : "projects"}</span>
        </div>
        {work.length === 0 ? (
          <p className="py-24 text-muted-foreground">Case studies are being written and will appear here soon.</p>
        ) : (
          <div className="mt-12 space-y-24 md:space-y-32">
            {work.map((p, i) => (
              <ProjectPreview key={p.id} project={p} index={i} />
            ))}
          </div>
        )}
      </section>

      {(s?.approach_text || s?.dev_background_text) && (
        <section className="container-page mt-32 grid gap-16 border-t border-border pt-16 md:grid-cols-2">
          {s?.approach_text && (
            <div>
              <h2 className="eyebrow">Approach</h2>
              <RichText text={s.approach_text} className="mt-6 text-lg leading-relaxed text-foreground/85" />
            </div>
          )}
          {s?.dev_background_text && (
            <div>
              <h2 className="eyebrow">Designing with engineering fluency</h2>
              <RichText text={s.dev_background_text} className="mt-6 text-lg leading-relaxed text-foreground/85" />
            </div>
          )}
        </section>
      )}

      {s?.about_intro && (
        <section className="container-page mt-32 grid gap-8 md:grid-cols-12">
          <h2 className="eyebrow md:col-span-4">About</h2>
          <div className="md:col-span-8">
            <RichText text={s.about_intro} className="display text-3xl leading-snug md:text-4xl" />
            <Link to="/about" className="link-underline mt-8 inline-flex items-center gap-2 text-primary">
              More about me <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      )}

      <section className="container-page mt-32">
        <div className="bg-primary px-8 py-16 text-primary-foreground md:px-16 md:py-20">
          <h2 className="display max-w-3xl text-4xl md:text-6xl">Let’s talk about the product you’re building.</h2>
          <div className="mt-10 flex flex-wrap gap-6">
            {s?.contact_email && (
              <a href={`mailto:${s.contact_email}`} className="link-underline text-lg">
                {s.contact_email}
              </a>
            )}
            <Link to="/contact" className="link-underline text-lg opacity-80">
              Other ways to reach me
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
