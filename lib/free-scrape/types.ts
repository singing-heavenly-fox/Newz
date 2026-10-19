// Free scraping pipeline shared types — server only (AGENTS.md §5, §21).
// Parallel to Oxylabs; the free path never touches oxylabs_* tables.

export interface FreeSource {
  id: string;
  name: string;
  listing_url: string;
  parser_strategy: string | null;
  rss_feed_url: string | null;
}

/** One RSS feed belonging to a source (from source_feeds or legacy fallback). */
export interface FeedSpec {
  feedUrl: string;
  label: string;
  isProxy: boolean;
}

/** One RSS feed entry: candidate article pointer + feed-level fallbacks. */
export interface RssItem {
  url: string;
  title: string | null;
  pubDate: string | null;
  imageUrl: string | null;
}

/** Cheerio extraction result for one article detail page. */
export interface ParsedArticle {
  title: string;
  canonicalUrl: string;
  imageUrl: string | null;
  publishedAt: string | null;
  rawText: string;
  paragraphs: string[];
}

/** Rejection buckets (grouped by count in the summary). */
export type RejectionReason =
  | "non-article-url"
  | "uncertain-url"
  | "missing-title"
  | "generic-title"
  | "missing-image"
  | "missing-date"
  | "short-body"
  | "fetch-failed"
  | "parse-failed";

export interface SourceError {
  source: string;
  error: string;
}

/** Run-logging summary object (AGENTS.md §9 shared pipeline rules). */
export interface ScrapeSummary {
  status: "completed" | "partial" | "failed";
  sourcesChecked: number;
  feedsChecked: number;
  candidatesFound: number;
  candidatesRejected: number;
  duplicatesSkipped: number;
  detailPagesScraped: number;
  articlesInserted: number;
  articlesRejected: number;
  articlesFailed: number;
  totalDurationMs: number;
  rejectionReasons: Record<string, number>;
  sourceErrors: SourceError[];
  insertedIds: string[];
}

export interface RunFreeScrapeOptions {
  sourceIds?: string[];
  limitPerSource?: number;
}

export const DEFAULT_LIMIT_PER_SOURCE = 5;
export const MAX_LIMIT_PER_SOURCE = 25;
/** Max RSS items consumed per feed per run (bounds work across many feeds). */
export const FEED_ITEM_CAP = 12;
