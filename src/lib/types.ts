import type { Database } from "@/integrations/supabase/types";
import type { Block, Media } from "./blocks";

export type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
export type SectionRow = Database["public"]["Tables"]["project_sections"]["Row"];
export type SettingsRow = Database["public"]["Tables"]["site_settings"]["Row"];

export interface ProjectCard {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  summary: string | null;
  category: string | null;
  role: string | null;
  cover: Media | null;
  featured: boolean;
}

export interface CaseStudy extends ProjectCard {
  team: string | null;
  timeline: string | null;
  project_status: string | null;
  live_url: string | null;
  prototype_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  published: boolean;
  blocks: Block[];
}

export interface CaseStudyPage {
  project: CaseStudy;
  prev: ProjectCard | null;
  next: ProjectCard | null;
  related: ProjectCard[];
}

export type PublicSettings = SettingsRow & { resume_href: string | null };
