import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { fetchCaseStudyPage, fetchPublishedCards, signPaths } from "./content";
import type { PublicSettings } from "./types";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

/** Signed URLs come back on the server-internal host; serve them on the browser-facing one. */
function browserUrl(u: string) {
  const internal = process.env["SUPABASE_URL"];
  const external = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
  return internal && external && u.startsWith(internal) ? external + u.slice(internal.length) : u;
}

export const getSiteSettings = createServerFn({ method: "GET" }).handler(async (): Promise<PublicSettings | null> => {
  const client = publicClient();
  const { data, error } = await client.from("site_settings").select("*").eq("id", 1).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  let resume_href: string | null = null;
  if (data.resume_url) {
    if (/^https?:\/\//.test(data.resume_url)) resume_href = data.resume_url;
    else resume_href = (await signPaths(client, [data.resume_url], browserUrl))[data.resume_url] ?? null;
  }
  return { ...data, resume_href };
});

export const listPublishedProjects = createServerFn({ method: "GET" }).handler(async () =>
  fetchPublishedCards(publicClient(), browserUrl),
);

export const getCaseStudy = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => ({ slug: String(input.slug).slice(0, 120) }))
  .handler(async ({ data }) => fetchCaseStudyPage(publicClient(), data.slug, browserUrl));

export const listSitemapEntries = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient()
    .from("projects")
    .select("slug, updated_at")
    .eq("published", true);
  if (error) throw new Error(error.message);
  return data;
});
