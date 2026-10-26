import { describe, expect, it } from "vitest";
import { publishProblems, toEmbedUrl, type Block } from "@/lib/blocks";

const text: Block = { id: "1", section_type: "text", title: "", content: { body: "Hello" } };

describe("publishing rules", () => {
  it("allows publishing with title, slug, summary and one filled block", () => {
    expect(publishProblems({ title: "Airspace", slug: "airspace", summary: "S", blocks: [text] })).toEqual([]);
  });
  it("blocks publishing without content blocks", () => {
    expect(publishProblems({ title: "A", slug: "a", summary: "S", blocks: [] })).toHaveLength(1);
  });
  it("blocks publishing with an invalid slug", () => {
    expect(publishProblems({ title: "A", slug: "Bad Slug", summary: "S", blocks: [text] })).toHaveLength(1);
  });
});

describe("embeds", () => {
  it("rejects unknown hosts", () => expect(toEmbedUrl("https://evil.example/x")).toBeNull());
  it("converts YouTube links", () =>
    expect(toEmbedUrl("https://www.youtube.com/watch?v=abc")).toBe("https://www.youtube-nocookie.com/embed/abc"));
});
