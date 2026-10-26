import type { ReactNode } from "react";

/** Minimal, safe inline formatting: **bold**, *italic*, [label](https://url). No raw HTML. */
function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${keyBase}-${i++}`;
    if (m[1]) out.push(<strong key={k} className="font-semibold text-foreground">{m[1]}</strong>);
    else if (m[2]) out.push(<em key={k}>{m[2]}</em>);
    else
      out.push(
        <a key={k} href={m[4]} className="link-underline text-primary" target="_blank" rel="noreferrer noopener">
          {m[3]}
        </a>,
      );
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function RichText({ text, className }: { text: string; className?: string }) {
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return (
    <div className={className}>
      {paras.map((p, i) => (
        <p key={i} className="mt-5 first:mt-0">
          {p.split("\n").flatMap((line, j, arr) => [
            ...inline(line, `${i}-${j}`),
            j < arr.length - 1 ? <br key={`br-${i}-${j}`} /> : null,
          ])}
        </p>
      ))}
    </div>
  );
}

export function InlineText({ text }: { text: string }) {
  return <>{inline(text, "i")}</>;
}
