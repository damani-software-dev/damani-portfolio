import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import type { ProjectCard } from "@/lib/types";
import { SmartImage } from "./SmartImage";

export function ProjectPreview({ project, index }: { project: ProjectCard; index: number }) {
  return (
    <article className="group">
      <Link to="/work/$slug" params={{ slug: project.slug }} className="block">
        <div className="overflow-hidden border border-border bg-surface">
          <SmartImage
            media={project.cover}
            className="aspect-[16/10] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.015]"
            fallbackLabel={project.title}
            loading={index < 2 ? "eager" : "lazy"}
          />
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-12">
          <div className="md:col-span-7">
            <p className="eyebrow">
              {String(index + 1).padStart(2, "0")}
              {project.category ? ` — ${project.category}` : ""}
            </p>
            <h3 className="display mt-3 flex items-start gap-2 text-3xl md:text-4xl">
              {project.title}
              <ArrowUpRight className="mt-1 size-5 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
            </h3>
          </div>
          <div className="md:col-span-5">
            {project.summary && <p className="text-[0.95rem] leading-relaxed text-muted-foreground">{project.summary}</p>}
            {project.role && (
              <p className="mt-3 text-sm">
                <span className="text-muted-foreground">Role · </span>
                {project.role}
              </p>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}
