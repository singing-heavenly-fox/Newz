import { cn } from "@/lib/utils";

export function Separator({ className }: { className?: string }) {
  return (
    <hr className={cn("border-slate-200 dark:border-slate-800", className)} />
  );
}
