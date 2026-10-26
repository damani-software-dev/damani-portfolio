import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CaseStudyView } from "@/components/site/CaseStudyView";
import { caseStudyQuery } from "@/lib/queries";

export const Route = createFileRoute("/_site/work/$slug")({
  loader: async ({ context, params }) => {
    const page = await context.queryClient.ensureQueryData(caseStudyQuery(params.slug));
    if (!page) throw notFound();
    return page;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Case study unavailable" }, { name: "robots", content: "noindex" }] };
    const p = loaderData.project;
    const title = p.seo_title || `${p.title} — Case study · Damani Beckford`;
    const desc = p.seo_description || p.summary || p.subtitle || `${p.title} case study.`;
    const img = p.cover?.url;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(img?.startsWith("https://")
          ? [
              { property: "og:image", content: img },
              { name: "twitter:image", content: img },
            ]
          : []),
      ],
    };
  },
  component: CaseStudyPage,
});

function CaseStudyPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(caseStudyQuery(slug));
  if (!data) return null;
  return <CaseStudyView project={data.project} prev={data.prev} next={data.next} related={data.related} />;
}
