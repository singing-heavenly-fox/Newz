import type { ArticleAnalysis } from "@/lib/types";

function firstSentence(text: string): string {
  const m = text.match(/^[^.!?]+[.!?]/);
  return (m?.[0] ?? text).trim();
}

export function KeyTakeaways({ summary, framingNotes }: { summary: string; framingNotes: string[] }) {
  // Derived display-only from stored fields: no schema change.
  const points = [firstSentence(summary), ...framingNotes].slice(0, 3);
  return (
    <section aria-labelledby="takeaways-heading" className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 id="takeaways-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Key takeaways
      </h2>
      <ul className="mt-3 space-y-2.5">
        {points.map((p) => (
          <li key={p} className="flex gap-2.5 text-[15px] leading-7 text-slate-700 dark:text-slate-200">
            <span aria-hidden className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              ✓
            </span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function splitParagraphs(raw: string): string[] {
  return raw
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function ByTheNumbers({
  analysis,
  readMinutes,
  words,
}: {
  analysis: ArticleAnalysis;
  readMinutes: number;
  words: number;
}) {
  const stats = [
    { label: "Sentiment", value: analysis.sentiment_score.toFixed(2), sub: analysis.sentiment_label },
    { label: "Bias score", value: analysis.bias_score.toFixed(2), sub: `AI · ${analysis.bias_label}` },
    { label: "Confidence", value: `${Math.round(analysis.confidence * 100)}%`, sub: `model ${analysis.model}` },
    { label: "Left / Ctr / Right", value: `${analysis.left_percentage}/${analysis.center_percentage}/${analysis.right_percentage}`, sub: "sums to 100" },
    { label: "Length", value: `${readMinutes} min`, sub: `${words.toLocaleString()} words` },
  ];
  return (
    <section aria-label="By the numbers" className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {stats.map((s) => (
        <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{s.label}</p>
          <p className="mt-1 truncate text-lg font-extrabold tracking-tight text-slate-900 dark:text-white" title={s.value}>
            {s.value}
          </p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400" title={s.sub}>{s.sub}</p>
        </div>
      ))}
    </section>
  );
}
