// Signature "Newz signal" loader — shared by every loading screen.
// CSS-only equalizer bars on the brand gradient tile (no JS, no new deps).

import { cn } from "@/lib/utils";

const BARS = [
  { height: "h-4", delay: "newz-eq-delay-0" },
  { height: "h-7", delay: "newz-eq-delay-1" },
  { height: "h-5", delay: "newz-eq-delay-2" },
] as const;

export function LoadingSignal({
  caption = "Tuning the signal",
  tileSize = 56,
  className,
}: {
  caption?: string;
  tileSize?: number;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label={caption}
      className={cn("flex flex-col items-center gap-3", className)}
    >
      <div className="relative">
        <div
          className="flex items-end justify-center gap-1.5 rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-amber-600 shadow-lg shadow-indigo-950/50"
          style={{ width: tileSize, height: tileSize, paddingBottom: tileSize * 0.22 }}
          aria-hidden
        >
          {BARS.map((bar) => (
            <span
              key={bar.delay}
              className={cn(
                "newz-eq-bar w-1.5 rounded-full bg-white/95",
                bar.height,
                bar.delay,
              )}
            />
          ))}
        </div>
        <span
          aria-hidden
          className="newz-dot absolute -right-1 -top-1 h-3 w-3 rounded-full bg-amber-300 ring-4 ring-amber-300/20"
        />
      </div>
      <p className="text-[13px] font-semibold tracking-wide text-slate-400">
        {caption}
        <span aria-hidden className="newz-ellipsis" />
      </p>
    </div>
  );
}
