import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { BiasLabel } from "@/lib/types";

const styles: Record<BiasLabel, string> = {
  left: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300",
  center: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-300",
  right: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  mixed: "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900 dark:bg-teal-950 dark:text-teal-300",
  unclear: "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400",
};

export function FramingBadge({ label }: { label: BiasLabel }) {
  return (
    <Badge
      className={cn(styles[label])}
      title="AI-estimated political framing — not objective truth"
    >
      AI-{label}
    </Badge>
  );
}
