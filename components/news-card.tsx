import Image from "next/image";
import Link from "next/link";
import { FramingBadge } from "@/components/framing-badge";
import { SentimentBadge } from "@/components/sentiment-badge";
import { FramingBar } from "@/components/framing-bar";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { Article } from "@/lib/types";

export function NewsCard({ article }: { article: Article }) {
  const a = article.analysis;
  const pct = a ? Math.round(a.confidence * 100) : null;
  return (
    <Card className="group overflow-hidden border-slate-800 bg-[#111a2e] hover:border-slate-700 dark:bg-[#111a2e]">
      <Link href={`/news/${article.id}`} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
        <div className="relative aspect-[16/9] overflow-hidden bg-slate-800">
          <Image
            src={article.image_url}
            alt={article.title}
            fill
            unoptimized
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <span className="text-indigo-300">{article.source.name}</span>
            <span aria-hidden>·</span>
            <time dateTime={article.published_at}>{formatDate(article.published_at)}</time>
            <span aria-hidden>·</span>
            <span>{article.read_minutes} min</span>
          </div>
          <h3 className="mt-2 line-clamp-2 text-[17px] font-extrabold leading-snug tracking-tight text-white group-hover:text-indigo-300">
            {article.title}
          </h3>
          <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-slate-300">
            {article.excerpt}
          </p>
          {a && (
            <div className="mt-3 space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <SentimentBadge label={a.sentiment_label} />
                <FramingBadge label={a.bias_label} />
                {pct !== null && (
                  <span className="ml-auto text-xs font-bold text-slate-200">{pct}%</span>
                )}
              </div>
              <FramingBar
                left={a.left_percentage}
                center={a.center_percentage}
                right={a.right_percentage}
              />
            </div>
          )}
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-indigo-400">
            Read analysis
            <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
          </span>
        </div>
      </Link>
    </Card>
  );
}
