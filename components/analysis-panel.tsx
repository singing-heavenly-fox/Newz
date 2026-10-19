import { FramingBadge } from "@/components/framing-badge";
import { SentimentBadge } from "@/components/sentiment-badge";
import { SentimentGauge } from "@/components/sentiment-gauge";
import { clamp01, normalizeFraming } from "@/lib/utils";
import type { Article, ArticleAnalysis } from "@/lib/types";

function takeawayPoints(summary: string, notes: string[]): string[] {
  const m = summary.match(/^[^.!?]+[.!?]/);
  const first = (m?.[0] ?? summary).trim();
  return [first, ...notes].slice(0, 3);
}

/** Continuous L→C→R gradient bar with proportional stops (story mockup). */
function BiasGradientBar({ left, center, right }: { left: number; center: number; right: number }) {
  const [l, c, r] = normalizeFraming(left, center, right);
  return (
    <div>
      <div
        role="img"
        aria-label={`Framing: left ${l} percent, center ${c} percent, right ${r} percent`}
        className="h-2 w-full rounded-full"
        style={{
          background: `linear-gradient(90deg, #0ea5e9 0%, #0ea5e9 ${l}%, #8b5cf6 ${l}%, #8b5cf6 ${l + c}%, #f59e0b ${l + c}%, #f59e0b 100%)`,
        }}
      />
      <div className="mt-1.5 flex items-center gap-3 text-[11px] font-medium text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-500" aria-hidden />L {l}%
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500" aria-hidden />C {c}%
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />R {r}%
        </span>
      </div>
    </div>
  );
}

/**
 * Sticky AI-analysis panel for the story page (Image 1, stacks on mobile).
 * Server component, props-only, stored data only.
 */
export function AnalysisPanel({
  analysis,
  related,
}: {
  analysis: ArticleAnalysis;
  related: Article[];
}) {
  const alignment = Math.max(
    analysis.left_percentage,
    analysis.center_percentage,
    analysis.right_percentage,
  );
  const points = takeawayPoints(analysis.summary, analysis.framing_notes);
  return (
    <section
      aria-label="AI analysis"
      className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111a2e]"
    >
      <p className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-300">
        <span aria-hidden>✦</span> AI analysis
      </p>

      <h2 className="mt-4 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">
        Overview
      </h2>
      <div className="mt-3 space-y-4">
        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Sentiment</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <SentimentBadge label={analysis.sentiment_label} />
            <SentimentGauge value={analysis.confidence} />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Framing</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <FramingBadge label={analysis.bias_label} />
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {Math.round(clamp01(alignment / 100) * 100)}% alignment
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-violet-500"
              style={{ width: `${clamp01(alignment / 100) * 100}%` }}
            />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Bias / Lean</p>
          <div className="mt-2">
            <BiasGradientBar
              left={analysis.left_percentage}
              center={analysis.center_percentage}
              right={analysis.right_percentage}
            />
          </div>
        </div>
      </div>

      <h2 className="mt-5 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">
        Key Takeaways
      </h2>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[13px] leading-6 text-slate-600 dark:text-slate-300">
        {points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>

      {related.length > 0 && (
        <>
          <h2 className="mt-5 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">
            Compare Coverage
          </h2>
          <ul className="relative mt-2">
            <span
              aria-hidden
              className="absolute bottom-4 right-8 top-4 w-px bg-gradient-to-b from-violet-500/60 via-slate-600/60 to-amber-500/60"
            />
            {related.slice(0, 5).map((a, i) => (
              <li key={a.id} className="relative flex items-center justify-between gap-2 py-2 text-sm">
                <span>
                  <span className="block font-semibold text-slate-700 dark:text-slate-200">
                    {a.source.name}
                  </span>
                  {a.analysis && (
                    <span className="block text-[11px] text-slate-500 dark:text-slate-500">
                      AI-{a.analysis.bias_label}
                    </span>
                  )}
                </span>
                {a.analysis && (
                  <span className="relative z-10">
                    <FramingBadge label={a.analysis.bias_label} />
                    {i === 0 && (
                      <svg
                        aria-hidden
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        className="absolute -right-2 -top-2 text-slate-300 dark:text-slate-500"
                      >
                        <path
                          d="M10 0c.7 5.5 4.5 9.3 10 10-5.5.7-9.3 4.5-10 10-.7-5.5-4.5-9.3-10-10 5.5-.7 9.3-4.5 10-10z"
                          fill="currentColor"
                        />
                      </svg>
                    )}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
