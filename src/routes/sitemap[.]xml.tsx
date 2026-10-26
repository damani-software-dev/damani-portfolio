import { createFileRoute } from "@tanstack/react-router";
import { listSitemapEntries } from "@/lib/public.functions";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const entries = await listSitemapEntries();
        const urls = [
          { loc: `${origin}/` },
          { loc: `${origin}/about` },
          { loc: `${origin}/contact` },
          ...entries.map((e) => ({ loc: `${origin}/work/${e.slug}`, lastmod: e.updated_at })),
        ];
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls
          .map((u) => `<url><loc>${u.loc}</loc>${"lastmod" in u && u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}</url>`)
          .join("")}</urlset>`;
        return new Response(xml, { headers: { "Content-Type": "application/xml" } });
      },
    },
  },
});
