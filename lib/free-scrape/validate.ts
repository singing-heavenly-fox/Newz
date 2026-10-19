// Candidate-URL filtering + article content gate — SERVER ONLY.
// Implements AGENTS.md §§ 9 (non-article reject list), 12, 13.

import "server-only";

import type { ParsedArticle, RejectionReason } from "@/lib/free-scrape/types";

/** Path fragments that are never article detail pages (§9 reject list). */
const GLOBAL_REJECT_RE =
  /\/(category|categories|topics?|tags?|authors?|search|newsletter|newsletters|subscribe|subscription|account|login|signin|sign-in|register|help|support|contact|about|careers|jobs|press|advertis|privacy|terms|cookies|accessibility|sitemap|archive|index)([\/?#]|$)/i;

const NON_ARTICLE_PAGE_RE =
  /\/(live|shows?|programs?|podcasts?|videos?|watch|listen|games?|puzzles?|crosswords?|recipes?|shopping|deals|coupons|store|products?|reviews?|quiz|quizzes|fantasy|betting|odds|sportsbook)([\/?#]|$)/i;

const GENERIC_TITLE_RE =
  /^(home|homepage|front page|latest news|breaking news|news|world news|us news|politics|business|technology|entertainment|sports|opinion|video|podcasts?|shows?|live( blog)?|newsletter|search|topics?|sections?)\b/i;

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** Normalize: absolute URL, drop fragment, strip tracking params. */
export function normalizeUrl(raw: string, base: string): string | null {
  try {
    const u = new URL(raw, base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    u.hash = "";
    for (const key of [...u.searchParams.keys()]) {
      if (/^(utm_|at_|cmpid|_intcmp|intcmp|fbclid|gclid|mc_cid|mc_eid)/i.test(key)) {
        u.searchParams.delete(key);
      }
    }
    return u.toString();
  } catch {
    return null;
  }
}

export interface UrlCheck {
  keep: boolean;
  reason?: RejectionReason;
}

/**
 * Source-specific article URL check (§§11–12). Stricter choice wins:
 * uncertain URLs are rejected before detail scraping.
 */
export function checkCandidateUrl(
  rawUrl: string,
  strategy: string | null,
  sourceHost: string,
  allowProxy = false,
): UrlCheck {
  const host = hostnameOf(rawUrl);
  if (!host) return { keep: false, reason: "non-article-url" };
  const s = (strategy ?? "").toLowerCase();

  // Google News proxy feeds (is_proxy): links point at news.google.com and
  // resolve to the publisher at fetch time; the canonical host guard below
  // validates the resolved publisher URL before anything is saved.
  if (allowProxy && host.includes("news.google.com")) {
    return { keep: true };
  }
  // All other strategies require the source's own host (or a subdomain).
  const bare = sourceHost.toLowerCase().replace(/^www\./, "");
  const h = host.replace(/^www\./, "");
  if (h !== bare && !h.endsWith(`.${bare}`)) {
    // Guardian regional hosts (observer, etc.) still count as Guardian.
    if (!(s === "guardian" && h.endsWith("theguardian.com"))) {
      return { keep: false, reason: "non-article-url" };
    }
  }

  let path = "";
  try {
    path = new URL(rawUrl).pathname;
  } catch {
    return { keep: false, reason: "non-article-url" };
  }
  if (GLOBAL_REJECT_RE.test(path) || NON_ARTICLE_PAGE_RE.test(path)) {
    return { keep: false, reason: "non-article-url" };
  }

  switch (s) {
    case "bbc":
      if (/\/sport\//i.test(path)) return { keep: false, reason: "non-article-url" };
      if (/\/(sounds|iplayer|newsbeat|newsround)/i.test(path)) {
        return { keep: false, reason: "non-article-url" };
      }
      if (/\/news\/(videos|av|live)\//i.test(path)) {
        return { keep: false, reason: "non-article-url" };
      }
      if (!/\/news\/(articles|world)\//i.test(path) && path.split("/").filter(Boolean).length < 3) {
        return { keep: false, reason: "uncertain-url" };
      }
      return { keep: true };
    case "npr":
      if (/\/(sections|podcasts|programs|music|books|goatsandsoda|health-shots)\//i.test(path)) {
        // /sections/* are section pages; story URLs carry /YYYY/MM/DD/ IDs.
        if (!/\/20\d\d\/\d\d?\/\d\d?\//.test(path)) {
          return { keep: false, reason: "non-article-url" };
        }
      }
      if (!/\/20\d\d\/\d\d?\/\d\d?\//.test(path) && !/nx-s1|g-s1/i.test(path)) {
        return { keep: false, reason: "uncertain-url" };
      }
      return { keep: true };
    case "fox":
      if (/\/(shows?|person|people|category|outkick-betting|newsletters)\//i.test(path)) {
        return { keep: false, reason: "non-article-url" };
      }
      if (path.split("/").filter(Boolean).length < 2) {
        return { keep: false, reason: "uncertain-url" };
      }
      return { keep: true };
    case "guardian":
      if (/\/live\//i.test(path)) return { keep: false, reason: "non-article-url" };
      if (!/\/20\d\d\/[a-z]+\/\d+/i.test(path) && !/\/commentisfree\/20/i.test(path)) {
        return { keep: false, reason: "uncertain-url" };
      }
      return { keep: true };
    case "reuters":
      // Direct reuters.com links (or post-redirect canonicals).
      if (/^\/[a-z-]+\/?$/i.test(path)) return { keep: false, reason: "non-article-url" };
      if (path.split("/").filter(Boolean).length < 2) {
        return { keep: false, reason: "uncertain-url" };
      }
      return { keep: true };
    default:
      if (path.split("/").filter(Boolean).length < 2) {
        return { keep: false, reason: "uncertain-url" };
      }
      return { keep: true };
  }
}

export interface GateResult {
  ok: boolean;
  reason?: RejectionReason;
}

/**
 * Post-parse guard: the resolved canonical URL must belong to the source
 * (bare host or subdomain; Guardian may use regional theguardian.com hosts).
 * Catches proxy mis-resolves and off-site canonicals before insert.
 */
export function canonicalHostMatches(
  canonicalUrl: string,
  sourceListingUrl: string,
  strategy: string | null,
): boolean {
  let canonicalHost: string;
  let sourceHost: string;
  try {
    canonicalHost = new URL(canonicalUrl).hostname.toLowerCase().replace(/^www\./, "");
    sourceHost = new URL(sourceListingUrl).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return false;
  }
  if (canonicalHost === sourceHost || canonicalHost.endsWith(`.${sourceHost}`)) {
    return true;
  }
  const s = (strategy ?? "").toLowerCase();
  if (s === "guardian" && canonicalHost.endsWith("theguardian.com")) return true;
  if (s === "bbc" && canonicalHost.endsWith("bbc.co.uk")) return true;
  if (s === "npr" && canonicalHost.endsWith("npr.org")) return true;
  return false;
}

/**
 * Article content gate (§13): meaningful body + image + published date.
 * Body passes with 3+ meaningful paragraphs OR 900+ meaningful chars.
 */
export function checkContentGate(article: ParsedArticle): GateResult {
  if (!article.title || article.title.trim().length < 15) {
    return { ok: false, reason: "missing-title" };
  }
  if (GENERIC_TITLE_RE.test(article.title.trim())) {
    return { ok: false, reason: "generic-title" };
  }
  if (!article.imageUrl) return { ok: false, reason: "missing-image" };
  if (!article.publishedAt) return { ok: false, reason: "missing-date" };
  const chars = article.rawText.replace(/\s+/g, " ").trim().length;
  if (article.paragraphs.length >= 3 || chars >= 900) {
    return { ok: true };
  }
  return { ok: false, reason: "short-body" };
}
