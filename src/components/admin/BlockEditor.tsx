import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  BLOCK_LABELS,
  BLOCK_TYPES,
  defaultContent,
  toEmbedUrl,
  type Block,
  type BlockContent,
  type BlockType,
  type Media,
} from "@/lib/blocks";
import { MediaField } from "./MediaField";

function Fields({ block, onChange, folder }: { block: Block; onChange: (c: BlockContent) => void; folder: string }) {
  const set = <T extends BlockType>(patch: Partial<BlockContent<T>>) => onChange({ ...(block.content as object), ...patch } as BlockContent);
  switch (block.section_type) {
    case "heading": {
      const c = block.content as BlockContent<"heading">;
      return (
        <div className="grid gap-2">
          <Input placeholder="Eyebrow (optional, e.g. 01 — Research)" value={c.eyebrow} onChange={(e) => set({ eyebrow: e.target.value })} aria-label="Eyebrow" />
          <Input placeholder="Heading" value={c.text} onChange={(e) => set({ text: e.target.value })} className="text-lg" aria-label="Heading" />
        </div>
      );
    }
    case "text": {
      const c = block.content as BlockContent<"text">;
      return (
        <div>
          <Textarea rows={6} placeholder="Write here. Blank line = new paragraph. **bold**, *italic*, [link](https://…)" value={c.body} onChange={(e) => set({ body: e.target.value })} aria-label="Paragraph" />
        </div>
      );
    }
    case "list": {
      const c = block.content as BlockContent<"list">;
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Switch id={`o-${block.id}`} checked={c.ordered} onCheckedChange={(v) => set({ ordered: v })} />
            <Label htmlFor={`o-${block.id}`}>Numbered</Label>
          </div>
          {c.items.map((it, i) => (
            <div key={i} className="flex gap-2">
              <Input value={it} onChange={(e) => set({ items: c.items.map((x, j) => (j === i ? e.target.value : x)) })} aria-label={`Item ${i + 1}`} />
              <Button type="button" variant="ghost" size="icon" aria-label="Remove item" onClick={() => set({ items: c.items.filter((_, j) => j !== i) })}><Trash2 /></Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => set({ items: [...c.items, ""] })}><Plus /> Item</Button>
        </div>
      );
    }
    case "image":
    case "full_image":
    case "diagram": {
      const c = block.content as BlockContent<"image">;
      return <MediaField value={c.image} folder={folder} onChange={(image) => set({ image })} />;
    }
    case "comparison": {
      const c = block.content as BlockContent<"comparison">;
      return (
        <div className="grid gap-4 md:grid-cols-2">
          {(["left", "right"] as const).map((side) => {
            const lk = side === "left" ? "leftLabel" : "rightLabel";
            return (
              <div key={side} className="space-y-2">
                <Input value={c[lk]} onChange={(e) => set({ [lk]: e.target.value })} aria-label={`${side} label`} placeholder="Label" />
                <MediaField value={c[side]} folder={folder} onChange={(m) => set({ [side]: m })} />
              </div>
            );
          })}
        </div>
      );
    }
    case "gallery": {
      const c = block.content as BlockContent<"gallery">;
      const update = (i: number, m: Media) => set({ images: c.images.map((x, j) => (j === i ? m : x)) });
      const move = (i: number, d: -1 | 1) => {
        const arr = [...c.images];
        [arr[i], arr[i + d]] = [arr[i + d]!, arr[i]!];
        set({ images: arr });
      };
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Switch id={`c-${block.id}`} checked={c.columns === 3} onCheckedChange={(v) => set({ columns: v ? 3 : 2 })} />
            <Label htmlFor={`c-${block.id}`}>Three columns on desktop</Label>
          </div>
          {c.images.map((m, i) => (
            <div key={i} className="border border-border p-3">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                Image {i + 1}
                <span className="flex gap-1">
                  <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Move image up" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp /></Button>
                  <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Move image down" disabled={i === c.images.length - 1} onClick={() => move(i, 1)}><ArrowDown /></Button>
                  <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Remove image" onClick={() => set({ images: c.images.filter((_, j) => j !== i) })}><Trash2 /></Button>
                </span>
              </div>
              <MediaField value={m} folder={folder} onChange={(x) => update(i, x)} />
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => set({ images: [...c.images, { path: "", alt: "", caption: "" }] })}><Plus /> Add image</Button>
        </div>
      );
    }
    case "quote": {
      const c = block.content as BlockContent<"quote">;
      return (
        <div className="grid gap-2">
          <Textarea rows={3} placeholder="Quote" value={c.quote} onChange={(e) => set({ quote: e.target.value })} aria-label="Quote" />
          <Input placeholder="Attribution (e.g. Research participant, Ops lead)" value={c.attribution} onChange={(e) => set({ attribution: e.target.value })} aria-label="Attribution" />
        </div>
      );
    }
    case "highlight": {
      const c = block.content as BlockContent<"highlight">;
      return (
        <div className="grid gap-2">
          <Input placeholder="Label" value={c.label} onChange={(e) => set({ label: e.target.value })} aria-label="Label" />
          <Textarea rows={3} placeholder="Insight" value={c.body} onChange={(e) => set({ body: e.target.value })} aria-label="Insight" />
        </div>
      );
    }
    case "embed": {
      const c = block.content as BlockContent<"embed">;
      const ok = !c.url || !!toEmbedUrl(c.url);
      return (
        <div className="grid gap-2">
          <Input placeholder="https://www.figma.com/proto/… or YouTube / Vimeo / Loom link" value={c.url} onChange={(e) => set({ url: e.target.value })} aria-label="Embed URL" aria-invalid={!ok} />
          {!ok && <p className="text-xs text-destructive">Use an https link from Figma, YouTube, Vimeo or Loom.</p>}
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Input placeholder="Caption (optional)" value={c.caption} onChange={(e) => set({ caption: e.target.value })} aria-label="Caption" />
            <select className="h-9 border border-input bg-background px-2 text-sm" value={c.aspect} onChange={(e) => set({ aspect: e.target.value as "16/9" })} aria-label="Aspect ratio">
              <option value="16/9">16:9</option>
              <option value="4/3">4:3</option>
              <option value="1/1">1:1</option>
            </select>
          </div>
        </div>
      );
    }
    case "metrics": {
      const c = block.content as BlockContent<"metrics">;
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Only include outcomes you can evidence.</p>
          {c.items.map((m, i) => (
            <div key={i} className="grid grid-cols-[8rem_1fr_auto] gap-2">
              <Input placeholder="Value" value={m.value} onChange={(e) => set({ items: c.items.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) })} aria-label="Value" />
              <Input placeholder="What it measures" value={m.label} onChange={(e) => set({ items: c.items.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} aria-label="Label" />
              <Button type="button" variant="ghost" size="icon" aria-label="Remove outcome" onClick={() => set({ items: c.items.filter((_, j) => j !== i) })}><Trash2 /></Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => set({ items: [...c.items, { value: "", label: "" }] })}><Plus /> Outcome</Button>
          <Textarea rows={2} placeholder="Context / how this was measured (optional)" value={c.note} onChange={(e) => set({ note: e.target.value })} aria-label="Note" />
        </div>
      );
    }
  }
}

export function AddBlockMenu({ onAdd, label = "Add block" }: { onAdd: (t: BlockType) => void; label?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm"><Plus /> {label}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {BLOCK_TYPES.map((t) => (
          <DropdownMenuItem key={t} onSelect={() => onAdd(t)} className="flex flex-col items-start gap-0">
            <span>{BLOCK_LABELS[t].label}</span>
            <span className="text-xs text-muted-foreground">{BLOCK_LABELS[t].hint}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function newBlock(t: BlockType): Block {
  return { id: crypto.randomUUID(), section_type: t, title: "", content: defaultContent(t) };
}

export function BlockList({ blocks, onChange, folder }: { blocks: Block[]; onChange: (b: Block[]) => void; folder: string }) {
  const update = (i: number, b: Block) => onChange(blocks.map((x, j) => (j === i ? b : x)));
  const move = (i: number, d: -1 | 1) => {
    const arr = [...blocks];
    [arr[i], arr[i + d]] = [arr[i + d]!, arr[i]!];
    onChange(arr);
  };
  const insertAt = (i: number, t: BlockType) => onChange([...blocks.slice(0, i), newBlock(t), ...blocks.slice(i)]);

  return (
    <div className="space-y-4">
      {blocks.length === 0 && (
        <div className="border border-dashed border-input p-10 text-center text-sm text-muted-foreground">
          No content yet. Build the narrative from blocks — headings, text, images, insights.
        </div>
      )}
      {blocks.map((b, i) => (
        <div key={b.id} className="border border-border bg-background">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2">
            <span className="eyebrow">{String(i + 1).padStart(2, "0")} · {BLOCK_LABELS[b.section_type].label}</span>
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Move block up" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp /></Button>
              <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Move block down" disabled={i === blocks.length - 1} onClick={() => move(i, 1)}><ArrowDown /></Button>
              <Button type="button" variant="ghost" size="icon" className="size-7 text-destructive" aria-label="Remove block" onClick={() => { if (confirm("Remove this block?")) onChange(blocks.filter((_, j) => j !== i)); }}><Trash2 /></Button>
            </div>
          </div>
          <div className="space-y-3 p-4">
            {b.section_type !== "heading" && (
              <Input
                placeholder="Section label (optional, e.g. Research, Final UI)"
                value={b.title}
                onChange={(e) => update(i, { ...b, title: e.target.value })}
                aria-label="Section label"
                className="h-8 text-xs"
              />
            )}
            <Fields block={b} folder={folder} onChange={(content) => update(i, { ...b, content })} />
          </div>
          <div className="border-t border-border px-4 py-2">
            <AddBlockMenu label="Insert below" onAdd={(t) => insertAt(i + 1, t)} />
          </div>
        </div>
      ))}
      <AddBlockMenu onAdd={(t) => onChange([...blocks, newBlock(t)])} />
    </div>
  );
}
