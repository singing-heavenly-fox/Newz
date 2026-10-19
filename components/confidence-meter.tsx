"use client";

import { clamp01 } from "@/lib/utils";

export function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(clamp01(value) * 100);
  return (
    <div
      role="img"
      aria-label={`AI confidence ${pct} percent`}
      title={`Confidence: ${pct}%`}
      className="inline-flex items-center gap-2"
    >
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        {pct}%
      </span>
    </div>
  );
}
