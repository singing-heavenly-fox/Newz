import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("newz-shimmer rounded-lg bg-slate-200 dark:bg-slate-800", className)}
    />
  );
}
