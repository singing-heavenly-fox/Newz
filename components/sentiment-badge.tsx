import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SentimentLabel } from "@/lib/types";

const styles: Record<SentimentLabel, string> = {
  positive: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  neutral: "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
  negative: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300",
};

const dot: Record<SentimentLabel, string> = {
  positive: "bg-emerald-500",
  neutral: "bg-slate-400",
  negative: "bg-rose-500",
};

const sign: Record<SentimentLabel, string> = {
  positive: "+ ",
  neutral: "",
  negative: "− ",
};

export function SentimentBadge({ label }: { label: SentimentLabel }) {
  return (
    <Badge className={cn(styles[label])} title={`Sentiment: ${label}`}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dot[label])} aria-hidden />
      {sign[label]}{label}
    </Badge>
  );
}
