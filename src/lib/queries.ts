import { queryOptions } from "@tanstack/react-query";
import { getCaseStudy, getSiteSettings, listPublishedProjects } from "./public.functions";

export const settingsQuery = queryOptions({
  queryKey: ["public", "settings"],
  queryFn: () => getSiteSettings(),
  staleTime: 60_000,
});

export const publishedProjectsQuery = queryOptions({
  queryKey: ["public", "projects"],
  queryFn: () => listPublishedProjects(),
  staleTime: 60_000,
});

export const caseStudyQuery = (slug: string) =>
  queryOptions({
    queryKey: ["public", "case-study", slug],
    queryFn: () => getCaseStudy({ data: { slug } }),
    staleTime: 60_000,
  });
