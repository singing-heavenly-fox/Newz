"use client";

import { normalizeFraming } from "@/lib/utils";

export function FramingBar({
  left,
  center,
  right,
}: {
  left: number;
  center: number;
  right: number;
}) {
  const [l, c, r] = normalizeFraming(left, center, right);
  return (
    <div>
      <div
        role="img"
        aria-label={`Framing: left ${l} percent, center ${c} percent, right ${r} percent`}
        className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
      >
        <div className="h-full bg-sky-500 transition-all duration-700" style={{ width: `${l}%` }} />
        <div className="h-full bg-violet-500 transition-all duration-700" style={{ width: `${c}%` }} />
        <div className="h-full bg-amber-500 transition-all duration-700" style={{ width: `${r}%` }} />
      </div>
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
