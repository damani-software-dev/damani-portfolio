import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { blockHasContent, toEmbedUrl, type Block, type BlockContent, type Media } from "@/lib/blocks";
import type { CaseStudy, ProjectCard } from "@/lib/types";
import { InlineText, RichText } from "./RichText";
import { SmartImage } from "./SmartImage";
import { ProjectPreview } from "./ProjectPreview";

function Figure({ media, wide = false }: { media: Media; wide?: boolean }) {
  return (
    <figure className={wide ? "" : "container-page"}>
      <div className="overflow-hidden border border-border bg-surface">
        <SmartImage media={media} className="h-auto w-full" />
      </div>
      {media.caption && (
        <figcaption className={`mt-3 text-sm text-muted-foreground ${wide ? "container-page" : ""}`}>
          {media.caption}
        </figcaption>
      )}
    </figure>
  );
}

function BlockView({ block }: { block: Block }) {
  const label = block.title?.trim();
  const Label = label ? <p className="eyebrow mb-4">{label}</p> : null;
  switch (block.section_type) {
    case "heading": {
      const c = block.content as BlockContent<"heading">;
      return (
        <div className="container-page">
          <div className="container-prose border-t border-border pt-10">
            {(c.eyebrow || label) && <p className="eyebrow mb-4">{c.eyebrow || label}</p>}
            <h2 className="display text-4xl md:text-5xl">{c.text}</h2>
          </div>
        </div>
      );
    }
    case "text": {
      const c = block.content as BlockContent<"text">;
      return (
        <div className="container-page">
          <div className="container-prose">
            {Label}
            <RichText text={c.body} className="text-[1.075rem] leading-[1.75] text-foreground/85" />
          </div>
        </div>
      );
    }
    case "list": {
      const c = block.content as BlockContent<"list">;
      const items = c.items.filter((i) => i.trim());
      const L = c.ordered ? "ol" : "ul";
      return (
        <div className="container-page">
          <div className="container-prose">
            {Label}
            <L className="space-y-3 text-[1.05rem] leading-relaxed text-foreground/85">
              {items.map((it, i) => (
                <li key={i} className="flex gap-4">
                  <span className="mt-[0.15rem] w-6 shrink-0 font-mono text-xs text-primary">
                    {c.ordered ? String(i + 1).padStart(2, "0") : "—"}
                  </span>
                  <span>
                    <InlineText text={it} />
                  </span>
                </li>
              ))}
            </L>
          </div>
        </div>
      );
    }
    case "image":
    case "diagram": {
      const c = block.content as BlockContent<"image">;
      return (
        <div>
          {label && <div className="container-page"><p className="eyebrow mb-4">{label}</p></div>}
          <Figure media={c.image} />
        </div>
      );
    }
    case "full_image": {
      const c = block.content as BlockContent<"full_image">;
      return <Figure media={c.image} wide />;
    }
    case "comparison": {
      const c = block.content as BlockContent<"comparison">;
      return (
        <div className="container-page">
          {Label}
          <div className="grid gap-6 md:grid-cols-2">
            {[
              { m: c.left, l: c.leftLabel },
              { m: c.right, l: c.rightLabel },
            ].map(({ m, l }, i) => (
              <figure key={i}>
                {l && <p className="eyebrow mb-3">{l}</p>}
                <div className="overflow-hidden border border-border bg-surface">
                  <SmartImage media={m} className="h-auto w-full" />
                </div>
                {m.caption && <figcaption className="mt-3 text-sm text-muted-foreground">{m.caption}</figcaption>}
              </figure>
            ))}
          </div>
        </div>
      );
    }
    case "gallery": {
      const c = block.content as BlockContent<"gallery">;
      const imgs = c.images.filter((m) => m.url);
      return (
        <div className="container-page">
          {Label}
          <div className={`grid gap-6 sm:grid-cols-2 ${c.columns === 3 ? "lg:grid-cols-3" : ""}`}>
            {imgs.map((m, i) => (
              <figure key={i}>
                <div className="overflow-hidden border border-border bg-surface">
                  <SmartImage media={m} className="h-auto w-full" />
                </div>
                {m.caption && <figcaption className="mt-3 text-sm text-muted-foreground">{m.caption}</figcaption>}
              </figure>
            ))}
          </div>
        </div>
      );
    }
    case "quote": {
      const c = block.content as BlockContent<"quote">;
      return (
        <div className="container-page">
          <figure className="container-prose">
            <blockquote className="display border-l-2 border-primary pl-6 text-3xl leading-tight md:text-4xl">
              “{c.quote}”
            </blockquote>
            {c.attribution && <figcaption className="mt-4 pl-6 text-sm text-muted-foreground">— {c.attribution}</figcaption>}
          </figure>
        </div>
      );
    }
    case "highlight": {
      const c = block.content as BlockContent<"highlight">;
      return (
        <div className="container-page">
          <aside className="container-prose border border-primary/20 bg-accent/60 p-6 md:p-8">
            <p className="eyebrow text-accent-foreground">{c.label || "Key insight"}</p>
            <RichText text={c.body} className="mt-3 text-lg leading-relaxed text-accent-foreground" />
          </aside>
        </div>
      );
    }
    case "embed": {
      const c = block.content as BlockContent<"embed">;
      const src = toEmbedUrl(c.url)!;
      return (
        <figure className="container-page">
          {Label}
          <div className="overflow-hidden border border-border bg-surface" style={{ aspectRatio: c.aspect }}>
            <iframe
              src={src}
              title={c.caption || label || "Embedded prototype"}
              className="h-full w-full"
              loading="lazy"
              allow="fullscreen; picture-in-picture"
              allowFullScreen
              sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
            />
          </div>
          {c.caption && <figcaption className="mt-3 text-sm text-muted-foreground">{c.caption}</figcaption>}
        </figure>
      );
    }
    case "metrics": {
      const c = block.content as BlockContent<"metrics">;
      const items = c.items.filter((i) => i.value.trim());
      return (
        <div className="container-page">
          <div className="border-y border-border py-10">
            <p className="eyebrow mb-6">{label || "Outcomes"}</p>
            <dl className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((m, i) => (
                <div key={i}>
                  <dt className="display text-5xl text-primary">{m.value}</dt>
                  <dd className="mt-2 text-sm text-muted-foreground">{m.label}</dd>
                </div>
              ))}
            </dl>
            {c.note && <p className="mt-8 max-w-2xl text-sm text-muted-foreground">{c.note}</p>}
          </div>
        </div>
      );
    }
  }
}

function Meta({ label, value }: { label: string; value: string | null }) {
  if (!value?.trim()) return null;
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-2 whitespace-pre-line text-sm leading-relaxed">{value}</dd>
    </div>
  );
}

export function CaseStudyView({
  project,
  prev,
  next,
  related = [],
}: {
  project: CaseStudy;
  prev?: ProjectCard | null;
  next?: ProjectCard | null;
  related?: ProjectCard[];
}) {
  const blocks = project.blocks.filter(blockHasContent);
  return (
    <article>
      <header className="container-page pt-16 md:pt-24">
        {project.category && <p className="eyebrow">{project.category}</p>}
        <h1 className="display mt-4 max-w-4xl text-5xl md:text-7xl">{project.title}</h1>
        {project.subtitle && (
          <p className="mt-6 max-w-2xl text-xl leading-relaxed text-muted-foreground">{project.subtitle}</p>
        )}
        <dl className="mt-12 grid gap-8 border-t border-border pt-8 sm:grid-cols-2 lg:grid-cols-4">
          <Meta label="Role" value={project.role} />
          <Meta label="Team" value={project.team} />
          <Meta label="Timeline" value={project.timeline} />
          <Meta label="Status" value={project.project_status} />
        </dl>
        {(project.live_url || project.prototype_url) && (
          <div className="mt-8 flex flex-wrap gap-6 text-sm">
            {project.live_url && (
              <a href={project.live_url} target="_blank" rel="noreferrer" className="link-underline inline-flex items-center gap-1 text-primary">
                View live product <ArrowUpRight className="size-4" />
              </a>
            )}
            {project.prototype_url && (
              <a href={project.prototype_url} target="_blank" rel="noreferrer" className="link-underline inline-flex items-center gap-1 text-primary">
                Open prototype <ArrowUpRight className="size-4" />
              </a>
            )}
          </div>
        )}
      </header>

      {project.cover?.url && (
        <div className="container-page mt-14">
          <div className="overflow-hidden border border-border bg-surface">
            <SmartImage media={project.cover} className="h-auto w-full" loading="eager" />
          </div>
        </div>
      )}

      {project.summary && (
        <div className="container-page mt-16">
          <p className="container-prose text-2xl leading-snug md:text-[1.7rem]">{project.summary}</p>
        </div>
      )}

      <div className="mt-16 space-y-16 md:space-y-20">
        {blocks.map((b) => (
          <section key={b.id}>
            <BlockView block={b} />
          </section>
        ))}
      </div>

      {(prev || next) && (
        <nav aria-label="More case studies" className="container-page mt-28 grid gap-px border border-border bg-border sm:grid-cols-2">
          {prev ? (
            <Link to="/work/$slug" params={{ slug: prev.slug }} className="group bg-background p-8 hover:bg-surface">
              <span className="eyebrow inline-flex items-center gap-2"><ArrowLeft className="size-3" /> Previous</span>
              <span className="display mt-3 block text-3xl">{prev.title}</span>
            </Link>
          ) : <div className="bg-background" />}
          {next ? (
            <Link to="/work/$slug" params={{ slug: next.slug }} className="group bg-background p-8 text-right hover:bg-surface">
              <span className="eyebrow inline-flex items-center gap-2">Next <ArrowRight className="size-3" /></span>
              <span className="display mt-3 block text-3xl">{next.title}</span>
            </Link>
          ) : <div className="bg-background" />}
        </nav>
      )}

      {related.length > 0 && (
        <section className="container-page mt-24" aria-labelledby="related">
          <h2 id="related" className="eyebrow mb-8">Related work</h2>
          <div className="grid gap-14 md:grid-cols-2">
            {related.map((p, i) => <ProjectPreview key={p.id} project={p} index={i} />)}
          </div>
        </section>
      )}
    </article>
  );
}
