import Image from "next/image";

type Block =
  | { kind: "p"; text: string }
  | { kind: "h2"; text: string }
  | { kind: "quote"; text: string; cite: string | null }
  | { kind: "ul"; items: string[] }
  | { kind: "figure"; src: string; caption: string };

/**
 * Block convention for `raw_text` (single string field, no schema change).
 * The future Oxylabs parsing step (AGENTS.md §13 cleanup) should emit these
 * so scraped stories automatically get the structured magazine render:
 * - `## Heading` → section heading (preserve in-article subheads)
 * - `> quote` (+ optional next line `— attribution`) → pull-quote
 * - consecutive `- item` lines → bullet list
 * - `[figure:URL|caption]` → floated inline figure (extra article images)
 * - everything else → paragraph
 *
 * Flat article text without markers takes the generic path: the renderer
 * composes the same depth (lede, pull-quote, Key Points, Story) from stored
 * fields only — so EVERY story renders like the mockup, not just marked-up ones.
 */
export function parseBodyBlocks(raw: string): Block[] {
  const lines = raw.split("\n").map((l) => l.trim());

  // Group raw lines into blank-line-separated chunks, then classify each.
  const chunks: string[][] = [];
  let cur: string[] = [];
  for (const l of lines) {
    if (l === "") {
      if (cur.length > 0) {
        chunks.push(cur);
        cur = [];
      }
    } else {
      cur.push(l);
    }
  }
  if (cur.length > 0) chunks.push(cur);

  const blocks: Block[] = [];

  for (const chunk of chunks) {
    if (chunk.length === 1 && chunk[0].startsWith("## ")) {
      blocks.push({ kind: "h2", text: chunk[0].slice(3).trim() });
    } else if (chunk.length >= 1 && chunk[0].startsWith("> ")) {
      const text = chunk[0].slice(2).trim();
      const cite =
        chunk.length > 1 && /^—/.test(chunk[1]) ? chunk[1].trim() : null;
      blocks.push({ kind: "quote", text, cite });
    } else if (chunk.every((l) => l.startsWith("- "))) {
      blocks.push({ kind: "ul", items: chunk.map((l) => l.slice(2).trim()) });
    } else if (
      chunk.length === 1 &&
      chunk[0].startsWith("[figure:") &&
      chunk[0].endsWith("]")
    ) {
      const inner = chunk[0].slice(8, -1);
      const sep = inner.indexOf("|");
      if (sep > 0) {
        blocks.push({
          kind: "figure",
          src: inner.slice(0, sep).trim(),
          caption: inner.slice(sep + 1).trim(),
        });
      } else {
        blocks.push({ kind: "p", text: chunk.join(" ") });
      }
    } else {
      blocks.push({ kind: "p", text: chunk.join(" ") });
    }
  }
  return blocks;
}

export function hasStructuredMarkers(raw: string): boolean {
  return /(^|\n)(## |> |- |\[figure:)/.test(raw);
}

export function splitBodyParagraphs(raw: string): string[] {
  return raw
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function firstSentence(text: string): string {
  const m = text.match(/^[^.!?]+[.!?]/);
  return (m?.[0] ?? text).trim();
}

function splitSentences(text: string): string[] {
  return (
    text.match(/[^.!?]+[.!?]/g)?.map((s) => s.trim()).filter(Boolean) ?? [
      text.trim(),
    ]
  );
}

/** Mine an attribution near a quote from stored text only — never invented. */
function mineAttribution(paragraph: string): string | null {
  const patterns = [
    /([A-Z][\w.]+ [A-Z][\w.]+(?: [A-Z][\w.]+)?),? (?:said|argued|added|noted|warned|told|counters?|cautioned|emphasized)/,
    /(?:said|argued|added|noted|warned|countered|cautioned|emphasized) ([A-Z][^.,;]{2,50})/,
    /—\s*([A-Z][^.,;]{2,50})\s*$/,
    /according to ([A-Z][^.,;]{2,50})/,
  ];
  for (const re of patterns) {
    const m = paragraph.match(re);
    if (m) return m[1].trim();
  }
  return null;
}

/**
 * Pull-quote for the generic path: first quoted segment in the stored article
 * text (curly or straight quotes, 20–240 chars) with mined attribution.
 * Falls back to the summary's first sentence, honestly cited.
 */
export function extractPullQuote(
  paragraphs: string[],
  summary: string,
): { text: string; cite: string | null } {
  const ordered = [...paragraphs.slice(1), ...paragraphs.slice(0, 1)];
  for (const p of ordered) {
    const m =
      p.match(/["“]([^""“”]{20,240})["”]/) ?? p.match(/"([^"]{20,240})"/);
    if (m) return { text: m[1].trim(), cite: mineAttribution(p) };
  }
  return { text: firstSentence(summary), cite: "AI neutral summary" };
}

/** Key-points bullets derived from stored summary + framing notes only. */
export function keyPoints(summary: string, framingNotes: string[]): string[] {
  return [...splitSentences(summary), ...framingNotes].slice(0, 4);
}

function H2({ children }: { children: string }) {
  return (
    <h2 className="pt-3 text-lg font-extrabold tracking-tight text-violet-300">
      {children}
    </h2>
  );
}

function PullQuote({ text, cite }: { text: string; cite: string | null }) {
  return (
    <blockquote className="my-2 rounded-r-2xl border-l-4 border-violet-500 bg-gradient-to-r from-violet-950/60 to-transparent px-5 py-4 text-lg italic leading-8 text-slate-100 lg:float-right lg:ml-6 lg:w-[42%]">
      “{text}”
      {cite && (
        <cite className="mt-1 block text-xs font-semibold not-italic uppercase tracking-wider text-slate-400">
          — {cite}
        </cite>
      )}
    </blockquote>
  );
}

/** Path A: structured render for marked-up `raw_text`. */
function StructuredBody({ blocks }: { blocks: Block[] }) {
  const firstParaIndex = blocks.findIndex((b) => b.kind === "p");
  return (
    <div>
      {blocks.map((b, i) => {
        if (b.kind === "h2") return <H2 key={i}>{b.text}</H2>;
        if (b.kind === "quote")
          return <PullQuote key={i} text={b.text} cite={b.cite} />;
        if (b.kind === "ul") {
          return (
            <ul key={i} className="list-disc space-y-1.5 pl-5 text-[15px] leading-7 text-slate-200">
              {b.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          );
        }
        if (b.kind === "figure") {
          return (
            <figure key={i} className="my-2 lg:float-right lg:ml-6 lg:w-[42%]">
              <span className="relative block aspect-[4/3] w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-800">
                <Image
                  src={b.src}
                  alt={b.caption}
                  fill
                  sizes="(max-width: 1024px) 100vw, 400px"
                  className="object-cover"
                />
              </span>
              <figcaption className="mt-1.5 text-xs leading-5 text-slate-500">
                {b.caption}
              </figcaption>
            </figure>
          );
        }
        return (
          <p
            key={i}
            className={
              i === firstParaIndex
                ? "text-lg leading-8 text-white first-letter:float-left first-letter:mr-2 first-letter:text-5xl first-letter:font-extrabold first-letter:text-indigo-400"
                : "text-[15px] leading-7 text-slate-200"
            }
          >
            {b.text}
          </p>
        );
      })}
      <div aria-hidden className="clear-both" />
    </div>
  );
}

/**
 * Magazine-style article body (Image 1 depth) for EVERY story.
 * Marked-up text → structured render; flat text → generic composition
 * (lede, mined pull-quote, Key Points, Story) from stored fields only.
 */
export function ArticleBody({
  rawText,
  summary,
  framingNotes,
}: {
  rawText: string;
  summary: string;
  framingNotes: string[];
}) {
  if (hasStructuredMarkers(rawText)) {
    return <StructuredBody blocks={parseBodyBlocks(rawText)} />;
  }
  const paras = splitBodyParagraphs(rawText);
  if (paras.length === 0) return null;
  const [lede, ...rest] = paras;
  const quote = extractPullQuote(paras, summary);
  const points = keyPoints(summary, framingNotes);
  return (
    <div className="space-y-4">
      <p className="text-lg leading-8 text-white first-letter:float-left first-letter:mr-2 first-letter:text-5xl first-letter:font-extrabold first-letter:text-indigo-400">
        {lede}
      </p>
      <PullQuote text={quote.text} cite={quote.cite} />
      <H2>Key Points</H2>
      <ul className="list-disc space-y-1.5 pl-5 text-[15px] leading-7 text-slate-200">
        {points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <H2>The Story</H2>
      {rest.map((p) => (
        <p key={p} className="text-[15px] leading-7 text-slate-200">
          {p}
        </p>
      ))}
      <div aria-hidden className="clear-both" />
    </div>
  );
}
