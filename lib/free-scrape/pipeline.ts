// Free scrape-to-insert orchestrator — SERVER ONLY. Never import from browser.
// Mirrors AGENTS.md §9 pipeline with native fetch + RSS instead of Oxylabs.

import "server-only";

import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { fetchHtml, sleep } from "@/lib/free-scrape/fetch";
import { fetchRssItems } from "@/lib/free-scrape/rss";
import { parseArticle } from "@/lib/free-scrape/parse";
import {
  checkCandidateUrl,
  checkContentGate,
  canonicalHostMatches,
  normalizeUrl,
} from "@/lib/free-scrape/validate";
import type {
  FeedSpec,
  FreeSource,
  RunFreeScrapeOptions,
  RssItem,
  ScrapeSummary,
} from "@/lib/free-scrape/types";
import {
  DEFAULT_LIMIT_PER_SOURCE,
  FEED_ITEM_CAP,
  MAX_LIMIT_PER_SOURCE,
} from "@/lib/free-scrape/types";

const EXISTENCE_CHUNK_SIZE = 15;
const ARTICLE_FETCH_GAP_MS = 500;

function bump(summary: ScrapeSummary, reason: string): void {
  summary.rejectionReasons[reason] = (summary.rejectionReasons[reason] ?? 0) + 1;
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === "23505"
  );
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function writeLog(
  level: string,
  source: string,
  message: string,
  meta: Record<string, unknown> | null,
): Promise<void> {
  try {
    const supabase = createServiceSupabaseClient();
    await supabase.from("logs").insert({ level, source, message, meta });
  } catch (err) {
    console.error(`[scrape-free] log write failed: ${errorMessage(err)}`);
  }
}

function sourceHostOf(listingUrl: string): string {
  try {
    return new URL(listingUrl).hostname;
  } catch {
    return listingUrl;
  }
}

async function existingUrls(urls: string[]): Promise<Set<string>> {
  const found = new Set<string>();
  const supabase = createServiceSupabaseClient();
  for (let i = 0; i < urls.length; i += EXISTENCE_CHUNK_SIZE) {
    const chunk = urls.slice(i, i + EXISTENCE_CHUNK_SIZE);
    const { data, error } = await supabase
      .from("articles")
      .select("original_url")
      .in("original_url", chunk);
    if (error) throw new Error(`URL existence check failed: ${error.message}`);
    for (const row of data ?? []) found.add(row.original_url);
  }
  return found;
}

async function canonicalExists(canonicalUrl: string): Promise<boolean> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("articles")
    .select("id")
    .or(`original_url.eq.${canonicalUrl},canonical_url.eq.${canonicalUrl}`)
    .limit(1);
  if (error) throw new Error(`Canonical check failed: ${error.message}`);
  return (data ?? []).length > 0;
}

export async function runFreeScrape(
  options: RunFreeScrapeOptions = {},
): Promise<ScrapeSummary> {
  const t0 = Date.now();
  const limit = Math.min(
    Math.max(options.limitPerSource ?? DEFAULT_LIMIT_PER_SOURCE, 1),
    MAX_LIMIT_PER_SOURCE,
  );
  const summary: ScrapeSummary = {
    status: "completed",
    sourcesChecked: 0,
    feedsChecked: 0,
    candidatesFound: 0,
    candidatesRejected: 0,
    duplicatesSkipped: 0,
    detailPagesScraped: 0,
    articlesInserted: 0,
    articlesRejected: 0,
    articlesFailed: 0,
    totalDurationMs: 0,
    rejectionReasons: {},
    sourceErrors: [],
    insertedIds: [],
  };

  console.log(
    `[scrape-free] scrape started (limitPerSource=${limit})`,
  );
  await writeLog("info", "scrape-free", "scrape started", {
    limitPerSource: limit,
    sourceIds: options.sourceIds ?? null,
  });

  let sources: FreeSource[];
  // source_id -> feeds (from source_feeds; legacy rss_feed_url fallback
  // applied per source below when it has no feed rows).
  const feedMap = new Map<string, FeedSpec[]>();
  try {
    const supabase = createServiceSupabaseClient();
    let query = supabase
      .from("sources")
      .select("id,name,listing_url,parser_strategy,rss_feed_url")
      .eq("is_active", true)
      .order("name");
    if (options.sourceIds && options.sourceIds.length > 0) {
      query = query.in("id", options.sourceIds);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    sources = (data ?? []) as FreeSource[];

    // Active section feeds with their sources (joined-table condition
    // applied in JS per AGENTS.md §21 gotcha). Missing table (migration
    // not applied yet) is non-fatal: every source falls back to its
    // legacy rss_feed_url below.
    interface FeedRow {
      id: string;
      source_id: string | null;
      label: string;
      feed_url: string;
      is_proxy: boolean;
      sources: {
        id: string;
        name: string;
        is_active: boolean;
      } | Array<{
        id: string;
        name: string;
        is_active: boolean;
      }> | null;
    }
    const firstSource = (
      value: FeedRow["sources"],
    ): { id: string; name: string; is_active: boolean } | null => {
      if (value == null) return null;
      return Array.isArray(value) ? (value[0] ?? null) : value;
    };
    const { data: feedData, error: feedError } = await supabase
      .from("source_feeds")
      .select("id,source_id,label,feed_url,is_proxy,sources(id,name,is_active)")
      .eq("is_active", true)
      .order("label");
    if (feedError) {
      console.warn(
        `[scrape-free] source_feeds unreadable (${feedError.message}) — using legacy rss_feed_url fallback`,
      );
    } else {
    const selectedIds =
      options.sourceIds && options.sourceIds.length > 0
        ? new Set(options.sourceIds)
        : null;
    for (const row of ((feedData ?? []) as unknown as FeedRow[])) {
      const src = firstSource(row.sources);
      if (!src || !src.is_active) continue;
      if (!row.source_id) continue;
      if (selectedIds && !selectedIds.has(row.source_id)) continue;
      // Skip feeds of sources outside the selected set (e.g. inactive).
      if (!sources.some((s) => s.id === row.source_id)) continue;
      const list = feedMap.get(row.source_id) ?? [];
      list.push({ feedUrl: row.feed_url, label: row.label, isProxy: row.is_proxy });
      feedMap.set(row.source_id, list);
    }
    } // end else: feed table readable
  } catch (err) {
    summary.status = "failed";
    summary.totalDurationMs = Date.now() - t0;
    const message = `failed to load sources: ${errorMessage(err)}`;
    console.error(`[scrape-free] ${message}`);
    await writeLog("error", "scrape-free", message, null);
    return summary;
  }

  summary.sourcesChecked = sources.length;
  console.log(
    `[scrape-free] selected sources: ${sources.map((s) => s.name).join(", ") || "(none)"}`,
  );

  for (const source of sources) {
    console.log(`[scrape-free] --- ${source.name}: start`);
    const feeds: FeedSpec[] = feedMap.get(source.id) ??
      (source.rss_feed_url
        ? [{ feedUrl: source.rss_feed_url, label: "Top stories", isProxy: false }]
        : []);
    if (feeds.length === 0) {
      summary.sourceErrors.push({
        source: source.name,
        error: "missing rss feeds — skipped",
      });
      bump(summary, "missing-rss-source");
      console.log(`[scrape-free] ${source.name}: no feeds, skipped`);
      continue;
    }
    const host = sourceHostOf(source.listing_url);
    let inserted = 0;
    let rejected = 0;
    try {
      // Fetch every section feed; one dead feed never kills the source.
      const byUrl = new Map<string, { item: RssItem; allowProxy: boolean }>();
      for (const feed of feeds) {
        let items: RssItem[];
        try {
          items = await fetchRssItems(feed.feedUrl);
        } catch (err) {
          const message = errorMessage(err);
          summary.sourceErrors.push({
            source: `${source.name} / ${feed.label}`,
            error: message,
          });
          console.error(
            `[scrape-free] ${source.name} / ${feed.label}: feed failed: ${message}`,
          );
          continue;
        }
        summary.feedsChecked += 1;
        const capped = items.slice(0, FEED_ITEM_CAP);
        summary.candidatesFound += capped.length;
        console.log(
          `[scrape-free] ${source.name} / ${feed.label}: ${capped.length} items`,
        );
        for (const item of capped) {
          const normalized = normalizeUrl(item.url, source.listing_url);
          if (!normalized) {
            summary.candidatesRejected += 1;
            bump(summary, "non-article-url");
            continue;
          }
          if (!byUrl.has(normalized)) {
            byUrl.set(normalized, { item, allowProxy: feed.isProxy });
          }
        }
      }

      // Candidate URL check (§12) before any detail fetch.
      const survivors: { url: string; item: RssItem }[] = [];
      for (const [url, entry] of byUrl) {
        const check = checkCandidateUrl(
          url,
          source.parser_strategy,
          host,
          entry.allowProxy,
        );
        if (!check.keep) {
          summary.candidatesRejected += 1;
          bump(summary, check.reason ?? "non-article-url");
          continue;
        }
        survivors.push({ url, item: entry.item });
      }
      console.log(
        `[scrape-free] ${source.name}: ${survivors.length} candidates kept, ` +
          `${byUrl.size - survivors.length} rejected`,
      );

      if (survivors.length === 0) continue;

      // URL existence check in chunks of ≤15 (§9).
      const existing = await existingUrls(survivors.map((s) => s.url));
      const fresh = survivors.filter((s) => {
        if (existing.has(s.url)) {
          summary.duplicatesSkipped += 1;
          return false;
        }
        return true;
      });
      console.log(
        `[scrape-free] ${source.name}: ${existing.size} duplicates skipped`,
      );

      const batch = fresh.slice(0, limit);
      for (const { url, item } of batch) {
        try {
          const page = await fetchHtml(url);
          summary.detailPagesScraped += 1;
          const parsed = parseArticle(page.html, page.finalUrl, {
            title: item.title,
            pubDate: item.pubDate,
            imageUrl: item.imageUrl,
          });
          if (!parsed) {
            summary.articlesFailed += 1;
            bump(summary, "parse-failed");
            continue;
          }
          // Proxy feeds (Google News) resolve to the publisher
          // at fetch time — never store the proxy URL as canonical.
          let canonicalUrl = parsed.canonicalUrl;
          try {
            if (new URL(canonicalUrl).hostname.includes("news.google.com")) {
              canonicalUrl = page.finalUrl;
            }
          } catch {
            canonicalUrl = page.finalUrl;
          }
          // Canonical must belong to the source (catches proxy
          // mis-resolves and off-site pages) — §12 stricter choice.
          if (
            !canonicalHostMatches(
              canonicalUrl,
              source.listing_url,
              source.parser_strategy,
            )
          ) {
            summary.articlesRejected += 1;
            rejected += 1;
            bump(summary, "uncertain-url");
            continue;
          }
          if (await canonicalExists(canonicalUrl)) {
            summary.duplicatesSkipped += 1;
            continue;
          }
          const gate = checkContentGate({ ...parsed, canonicalUrl });
          if (!gate.ok) {
            summary.articlesRejected += 1;
            rejected += 1;
            bump(summary, gate.reason ?? "short-body");
            continue;
          }
          const supabase = createServiceSupabaseClient();
          const { data, error } = await supabase
            .from("articles")
            .insert({
              source_id: source.id,
              original_url: canonicalUrl,
              canonical_url: canonicalUrl,
              title: parsed.title.trim(),
              image_url: parsed.imageUrl as string,
              published_at: parsed.publishedAt as string,
              raw_text: parsed.rawText,
              analyzed_at: null,
            })
            .select("id")
            .single();
          if (error) {
            if (isUniqueViolation(error)) {
              summary.duplicatesSkipped += 1;
            } else {
              throw new Error(error.message);
            }
            continue;
          }
          summary.articlesInserted += 1;
          inserted += 1;
          if (data) summary.insertedIds.push(data.id);
        } catch (err) {
          summary.articlesFailed += 1;
          bump(summary, "fetch-failed");
          console.error(
            `[scrape-free] ${source.name}: article failed (${url}): ${errorMessage(err)}`,
          );
        }
        await sleep(ARTICLE_FETCH_GAP_MS);
      }
      console.log(
        `[scrape-free] ${source.name}: done (inserted=${inserted}, rejected=${rejected})`,
      );
      await writeLog("info", "scrape-free", `source done: ${source.name}`, {
        source: source.name,
        inserted,
        rejected,
      });
    } catch (err) {
      const message = errorMessage(err);
      summary.sourceErrors.push({ source: source.name, error: message });
      console.error(`[scrape-free] ${source.name}: source error: ${message}`);
      await writeLog("error", "scrape-free", `source error: ${source.name}`, {
        source: source.name,
        error: message,
      });
    }
  }

  summary.totalDurationMs = Date.now() - t0;
  if (summary.sourcesChecked === 0) {
    summary.status = "failed";
  } else if (
    summary.sourceErrors.length >= summary.sourcesChecked &&
    summary.articlesInserted === 0
  ) {
    summary.status = "failed";
  } else if (
    summary.sourceErrors.length > 0 ||
    summary.articlesFailed > 0
  ) {
    summary.status = "partial";
  }
  console.log(`[scrape-free] scrape ${summary.status}:`, JSON.stringify(summary));
  await writeLog(
    summary.status === "failed" ? "error" : "info",
    "scrape-free",
    `scrape ${summary.status}`,
    summary as unknown as Record<string, unknown>,
  );
  return summary;
}
