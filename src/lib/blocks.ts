import { z } from "zod";

export const mediaSchema = z.object({
  path: z.string().default(""),
  alt: z.string().default(""),
  caption: z.string().default(""),
  url: z.string().optional(),
});
export type Media = z.infer<typeof mediaSchema>;

export const blockContentSchemas = {
  heading: z.object({ text: z.string().default(""), eyebrow: z.string().default("") }),
  text: z.object({ body: z.string().default("") }),
  list: z.object({ items: z.array(z.string()).default([""]), ordered: z.boolean().default(false) }),
  image: z.object({ image: mediaSchema.default({}) }),
  full_image: z.object({ image: mediaSchema.default({}) }),
  diagram: z.object({ image: mediaSchema.default({}) }),
  comparison: z.object({
    left: mediaSchema.default({}),
    right: mediaSchema.default({}),
    leftLabel: z.string().default("Before"),
    rightLabel: z.string().default("After"),
  }),
  gallery: z.object({
    images: z.array(mediaSchema).default([]),
    columns: z.union([z.literal(2), z.literal(3)]).default(2),
  }),
  quote: z.object({ quote: z.string().default(""), attribution: z.string().default("") }),
  highlight: z.object({ label: z.string().default("Key insight"), body: z.string().default("") }),
  embed: z.object({
    url: z.string().default(""),
    caption: z.string().default(""),
    aspect: z.enum(["16/9", "4/3", "1/1"]).default("16/9"),
  }),
  metrics: z.object({
    items: z.array(z.object({ value: z.string(), label: z.string() })).default([]),
    note: z.string().default(""),
  }),
} as const;

export type BlockType = keyof typeof blockContentSchemas;
export const BLOCK_TYPES = Object.keys(blockContentSchemas) as BlockType[];

export type BlockContent<T extends BlockType = BlockType> = z.infer<(typeof blockContentSchemas)[T]>;

export interface Block<T extends BlockType = BlockType> {
  id: string;
  section_type: T;
  title: string;
  content: BlockContent<T>;
}

export const BLOCK_LABELS: Record<BlockType, { label: string; hint: string }> = {
  heading: { label: "Section heading", hint: "Starts a new chapter" },
  text: { label: "Paragraph", hint: "Rich text with **bold** and [links](url)" },
  list: { label: "List", hint: "Bulleted or numbered" },
  image: { label: "Image", hint: "Single image with caption" },
  full_image: { label: "Full-width image", hint: "Edge-to-edge media" },
  comparison: { label: "Comparison", hint: "Two images side by side" },
  gallery: { label: "Gallery", hint: "Grid of images" },
  quote: { label: "Quote", hint: "Pull quote from research or a teammate" },
  highlight: { label: "Key insight", hint: "Call out an important finding" },
  diagram: { label: "Workflow / diagram", hint: "Journeys, IA, flows" },
  embed: { label: "Video / prototype", hint: "Figma, YouTube, Vimeo, Loom" },
  metrics: { label: "Outcomes", hint: "Real, evidenced results only" },
};

export function defaultContent<T extends BlockType>(type: T): BlockContent<T> {
  return blockContentSchemas[type].parse({}) as BlockContent<T>;
}

/** Validate untrusted DB content; falls back to defaults for malformed data. */
export function parseContent<T extends BlockType>(type: T, raw: unknown): BlockContent<T> {
  const r = blockContentSchemas[type].safeParse(raw ?? {});
  return (r.success ? r.data : defaultContent(type)) as BlockContent<T>;
}

export function isBlockType(v: string): v is BlockType {
  return v in blockContentSchemas;
}

type Loose = {
  text?: string; body?: string; items?: unknown[]; image?: Media; left?: Media; right?: Media;
  images?: Media[]; quote?: string; url?: string;
};
const hasMedia = (m?: Media) => !!m && !!(m.path || m.url);

/** Whether a block has enough content to render publicly. */
export function blockHasContent(b: Block): boolean {
  const c = b.content as Loose;
  switch (b.section_type) {
    case "heading":
      return !!(c.text as string)?.trim();
    case "text":
      return !!(c.body as string)?.trim();
    case "list":
      return (c.items as string[]).some((i) => i.trim());
    case "image":
    case "full_image":
    case "diagram":
      return hasMedia(c.image as Media);
    case "comparison":
      return hasMedia(c.left as Media) && hasMedia(c.right as Media);
    case "gallery":
      return (c.images as Media[]).some(hasMedia);
    case "quote":
      return !!(c.quote as string)?.trim();
    case "highlight":
      return !!(c.body as string)?.trim();
    case "embed":
      return !!toEmbedUrl(c.url as string);
    case "metrics":
      return (c.items as { value: string }[]).some((i) => i.value.trim());
  }
}

/** Collect every storage path referenced by blocks (for signing). */
export function collectPaths(blocks: Block[]): string[] {
  const out: string[] = [];
  const add = (m?: Media) => m?.path && out.push(m.path);
  for (const b of blocks) {
    const c = b.content as Loose;
    add(c.image as Media);
    add(c.left as Media);
    add(c.right as Media);
    (c.images as Media[] | undefined)?.forEach(add);
  }
  return out;
}

export function applyUrls(blocks: Block[], urls: Record<string, string>): Block[] {
  const fix = (m: Media): Media => (m.path && urls[m.path] ? { ...m, url: urls[m.path]! } : m);
  return blocks.map((b) => {
    const c: Loose = { ...(b.content as Loose) };
    if (c.image) c.image = fix(c.image as Media);
    if (c.left) c.left = fix(c.left as Media);
    if (c.right) c.right = fix(c.right as Media);
    if (c.images) c.images = c.images.map(fix);
    return { ...b, content: c as BlockContent };
  });
}

/** Only allow well-known embed providers, converted to their embeddable URLs. */
export function toEmbedUrl(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.replace(/^www\./, "");
  if (host === "youtube.com" && u.searchParams.get("v"))
    return `https://www.youtube-nocookie.com/embed/${u.searchParams.get("v")}`;
  if (host === "youtu.be") return `https://www.youtube-nocookie.com/embed${u.pathname}`;
  if (host === "vimeo.com" && /^\/\d+/.test(u.pathname))
    return `https://player.vimeo.com/video${u.pathname}`;
  if (host === "player.vimeo.com" || host === "youtube-nocookie.com") return u.toString();
  if (host === "loom.com") return u.toString().replace("/share/", "/embed/");
  if (host === "figma.com" || host.endsWith(".figma.com"))
    return host === "embed.figma.com" || u.pathname.startsWith("/embed")
      ? u.toString()
      : `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(u.toString())}`;
  return null;
}

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export interface PublishCheckInput {
  title: string;
  slug: string;
  summary: string | null;
  blocks: Block[];
}
/** Returns a list of problems preventing publication (empty = ok). */
export function publishProblems(p: PublishCheckInput): string[] {
  const out: string[] = [];
  if (!p.title.trim()) out.push("Add a title.");
  if (!SLUG_RE.test(p.slug)) out.push("Use a valid URL slug (lowercase letters, numbers, hyphens).");
  if (!p.summary?.trim()) out.push("Add a short summary.");
  if (!p.blocks.some(blockHasContent)) out.push("Add at least one content block with content.");
  return out;
}
