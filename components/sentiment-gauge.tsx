import { clamp01 } from "@/lib/utils";

/** Semicircle confidence gauge (dark-first, matches story mockup). */
export function SentimentGauge({ value }: { value: number }) {
  const pct = Math.round(clamp01(value) * 100);
  return (
    <span
      role="img"
      aria-label={`AI confidence ${pct} percent`}
      title={`Confidence: ${pct}%`}
      className="inline-flex items-center gap-2"
    >
      <svg width="64" height="38" viewBox="0 0 80 46" aria-hidden className="shrink-0">
        <defs>
          <linearGradient id="newz-gauge" x1="0" y1="0" x2="80" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#34d399" />
            <stop offset="1" stopColor="#10b981" />
          </linearGradient>
        </defs>
        <path
          d="M8 40 A32 32 0 0 1 72 40"
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          className="stroke-slate-200 dark:stroke-slate-700"
        />
        <path
          d="M8 40 A32 32 0 0 1 72 40"
          fill="none"
          stroke="url(#newz-gauge)"
          strokeWidth="8"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${pct} 100`}
        />
      </svg>
      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        {pct}% confidence
      </span>
    </span>
  );
}
