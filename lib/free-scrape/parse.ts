// Article detail-page extraction + cleanup — SERVER ONLY (AGENTS.md §13).

import "server-only";

import * as cheerio from "cheerio";

import type { ParsedArticle } from "@/lib/free-scrape/types";

const BODY_SELECTORS = [
  "article p",
  "main p",
  '[itemprop="articleBody"] p',
  ".story-body p",
  ".article__body p",
  ".article-body p",
  '[data-testid="article-body"] p',
  "#main-content p",
];

// Boilerplate / webpage-dump fragments that must not become raw_text (§13).
const BOILERPLATE_RE =
  /subscribe|newsletter|sign up for|click here for more|most viewed|most read|related (articles|stories|content)|load more|share (this|on)|follow us|advertisement|sponsored content|terms of use|privacy policy|all rights reserved|click here to sign up/i;

const MIN_PARAGRAPH_CHARS = 40;

function absolutize(href: string | undefined, base: string): string | null {
  if (!href) return null;
  try {
    const u = new URL(href, base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

function metaContent(
  $: cheerio.CheerioAPI,
  selector: string,
): string | null {
  const el = $(selector).first();
  const content = el.attr("content")?.trim();
  return content && content !== "" ? content : null;
}

/** Best-effort published-date extraction → ISO string, or null. */
function extractPublishedAt($: cheerio.CheerioAPI): string | null {
  const candidates: (string | null | undefined)[] = [
    metaContent($, 'meta[property="article:published_time"]'),
    metaContent($, 'meta[name="article:published_time"]'),
    metaContent($, 'meta[property="datePublished"]'),
    metaContent($, 'meta[name="publish-date"]'),
    metaContent($, 'meta[name="date"]'),
    metaContent($, 'meta[name="DC.date.issued"]'),
    $("time[datetime]").first().attr("datetime")?.trim(),
    $("time[pubdate]").first().attr("datetime")?.trim(),
  ];
  // JSON-LD fallback (NewsArticle / Article blocks).
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).text();
      const data: unknown = JSON.parse(raw);
      const blocks = Array.isArray(data) ? data : [data];
      for (const b of blocks) {
        if (typeof b === "object" && b !== null) {
          const rec = b as Record<string, unknown>;
          const d = rec["datePublished"] ?? rec["dateCreated"];
          if (typeof d === "string" && d.trim() !== "") {
            candidates.push(d.trim());
          }
        }
      }
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  });
  for (const c of candidates) {
    if (!c) continue;
    const t = Date.parse(c);
    if (!Number.isNaN(t)) return new Date(t).toISOString();
  }
  return null;
}

/** Collect meaningful body paragraphs, skipping boilerplate (§13). */
function extractParagraphs($: cheerio.CheerioAPI): string[] {
  // Remove webpage-dump elements before reading text.
  $("script, style, nav, header, footer, aside, form, noscript").remove();
  $(
    '[class*="newsletter"], [class*="subscribe"], [class*="related"], ' +
      '[class*="most-viewed"], [class*="most-read"], [class*="share-tools"], ' +
      '[class*="advertisement"], [id*="newsletter"], [id*="subscribe"]',
  ).remove();

  let found: string[] = [];
  for (const sel of BODY_SELECTORS) {
    const paras: string[] = [];
    $(sel).each((_, el) => {
      const t = $(el).text().replace(/\s+/g, " ").trim();
      if (t.length >= MIN_PARAGRAPH_CHARS && !BOILERPLATE_RE.test(t)) {
        paras.push(t);
      }
    });
    if (paras.length >= found.length) found = paras;
    if (found.length >= 3) break;
  }
  if (found.length === 0) {
    // Fallback: any <p> with substance (never reject on "one paragraph" alone).
    $("p").each((_, el) => {
      const t = $(el).text().replace(/\s+/g, " ").trim();
      if (t.length >= MIN_PARAGRAPH_CHARS && !BOILERPLATE_RE.test(t)) {
        found.push(t);
      }
    });
  }
  // Single giant block → split on sentence boundaries before validation (§13).
  if (found.length === 1 && (found[0]?.length ?? 0) >= 900) {
    const big = found[0] as string;
    const split = big
      .split(/(?<=[.!?])\s+(?=[A-Z0-9"“])/)
      .map((s) => s.trim())
      .filter((s) => s.length >= MIN_PARAGRAPH_CHARS);
    if (split.length > 1) return split;
  }
  return found;
}

/**
 * Parse one article detail page. RSS fallbacks (title/date/image) are used
 * only when the page itself lacks them — page evidence wins.
 */
export function parseArticle(
  html: string,
  pageUrl: string,
  rssFallback?: { title?: string | null; pubDate?: string | null; imageUrl?: string | null },
): ParsedArticle | null {
  let $: cheerio.CheerioAPI;
  try {
    $ = cheerio.load(html);
  } catch {
    return null;
  }
  const ogTitle =
    (metaContent($, 'meta[property="og:title"]') ??
      metaContent($, 'meta[name="twitter:title"]')) ||
    "";
  const h1 = $("article h1").first().text().replace(/\s+/g, " ").trim();
  const h1Any = $("h1").first().text().replace(/\s+/g, " ").trim();
  const docTitle = $("title").first().text().replace(/\s+/g, " ").trim();
  const title =
    ogTitle || h1 || h1Any || docTitle || rssFallback?.title?.trim() || "";

  const canonical =
    absolutize($('link[rel="canonical"]').attr("href"), pageUrl) ?? pageUrl;

  let imageUrl = absolutize(
    metaContent($, 'meta[property="og:image"]') ??
      metaContent($, 'meta[name="twitter:image"]') ??
      $('link[rel="image_src"]').attr("href") ??
      undefined,
    pageUrl,
  );
  if (!imageUrl) {
    const bodyImg = $("article img").first().attr("src") ?? $("main img").first().attr("src");
    imageUrl = absolutize(bodyImg, pageUrl) ?? rssFallback?.imageUrl ?? null;
  }

  let publishedAt = extractPublishedAt($);
  if (!publishedAt && rssFallback?.pubDate) {
    const t = Date.parse(rssFallback.pubDate);
    if (!Number.isNaN(t)) publishedAt = new Date(t).toISOString();
  }

  const paragraphs = extractParagraphs($);
  const rawText = paragraphs.join("\n\n");

  return { title, canonicalUrl: canonical, imageUrl, publishedAt, rawText, paragraphs };
}
