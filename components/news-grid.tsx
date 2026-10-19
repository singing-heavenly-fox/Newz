"use client";

import { useMemo, useState } from "react";
import { NewsCard } from "@/components/news-card";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import type { Article, BiasLabel, SentimentLabel } from "@/lib/types";

type SentFilter = "all" | SentimentLabel;
type BiasFilter = "all" | BiasLabel;
type Sort = "newest" | "oldest";

const SENT_OPTIONS: { value: SentFilter; label: string }[] = [
  { value: "all", label: "All Sentiment" },
  { value: "positive", label: "Positive" },
  { value: "neutral", label: "Neutral" },
  { value: "negative", label: "Negative" },
];

const BIAS_OPTIONS: { value: BiasFilter; label: string }[] = [
  { value: "all", label: "All Framing" },
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
  { value: "mixed", label: "Mixed" },
  { value: "unclear", label: "Unclear" },
];

export function NewsGrid({ articles }: { articles: Article[] }) {
  const [query, setQuery] = useState("");
  const [sentiment, setSentiment] = useState<SentFilter>("all");
  const [framing, setFraming] = useState<BiasFilter>("all");
  const [sort, setSort] = useState<Sort>("newest");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = articles.filter((a) => {
      if (sentiment !== "all" && a.analysis?.sentiment_label !== sentiment) return false;
      if (framing !== "all" && a.analysis?.bias_label !== framing) return false;
      if (q && !`${a.title} ${a.excerpt} ${a.source.name}`.toLowerCase().includes(q)) return false;
      return true;
    });
    list = [...list].sort((x, y) =>
      sort === "newest"
        ? +new Date(y.published_at) - +new Date(x.published_at)
        : +new Date(x.published_at) - +new Date(y.published_at),
    );
    return list;
  }, [articles, query, sentiment, framing, sort]);

  const clear = () => {
    setQuery("");
    setSentiment("all");
    setFraming("all");
    setSort("newest");
  };

  const pill = (active: boolean) =>
    cn(
      "shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
      active
        ? "bg-violet-600 text-white hover:bg-violet-500"
        : "border border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600 hover:text-white",
    );

  const selectPill =
    "shrink-0 appearance-none rounded-full border border-slate-700 bg-slate-900 py-2 pl-4 pr-8 text-[13px] font-semibold text-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500";

  return (
    <div>
      <label className="flex items-center gap-2 rounded-xl border border-slate-800 bg-[#111a2e] px-4 py-3">
        <span aria-hidden className="text-slate-500">⌕</span>
        <span className="sr-only">Search articles</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search headlines, topics…"
          className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
        />
      </label>

      <div
        className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
        role="group"
        aria-label="Story filters"
      >
        <button type="button" onClick={() => setSort("newest")} className={pill(sort === "newest")} aria-pressed={sort === "newest"}>
          Latest
        </button>
        <span className="relative inline-flex shrink-0 items-center">
          <span className="sr-only">Filter by sentiment</span>
          <select
            aria-label="Filter by sentiment"
            value={sentiment}
            onChange={(e) => setSentiment(e.target.value as SentFilter)}
            className={selectPill}
          >
            {SENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <span aria-hidden className="pointer-events-none absolute right-3 text-xs text-slate-500">▾</span>
        </span>
        <span className="relative inline-flex shrink-0 items-center">
          <span className="sr-only">Filter by framing</span>
          <select
            aria-label="Filter by framing"
            value={framing}
            onChange={(e) => setFraming(e.target.value as BiasFilter)}
            className={selectPill}
          >
            {BIAS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <span aria-hidden className="pointer-events-none absolute right-3 text-xs text-slate-500">▾</span>
        </span>
        <button
          type="button"
          onClick={() => setSort((s) => (s === "newest" ? "oldest" : "newest"))}
          className={pill(false)}
          aria-pressed={sort === "oldest"}
          title="Toggle sort order"
        >
          {sort === "newest" ? "Newest" : "Oldest"}
        </button>
        <span className="ml-auto hidden items-center gap-3 pl-2 sm:inline-flex">
          <span className="text-sm text-slate-500" aria-live="polite">
            {filtered.length} of {articles.length}
          </span>
          <button
            type="button"
            onClick={clear}
            className="rounded-full px-3 py-2 text-sm font-semibold text-indigo-400 hover:bg-indigo-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            Clear
          </button>
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-500 sm:hidden" aria-live="polite">
        {filtered.length} of {articles.length}{" "}
        <button
          type="button"
          onClick={clear}
          className="ml-2 font-semibold text-indigo-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          Clear
        </button>
      </p>

      {filtered.length === 0 ? (
        <div className="mt-6">
          <EmptyState onClear={clear} />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <NewsCard key={a.id} article={a} />
          ))}
        </div>
      )}
    </div>
  );
}
