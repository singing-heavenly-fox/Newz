// RSS feed fetching + parsing — SERVER ONLY. Never import from browser code.

import "server-only";

import { XMLParser } from "fast-xml-parser";

import { fetchText } from "@/lib/free-scrape/fetch";
import type { RssItem } from "@/lib/free-scrape/types";

const MAX_ITEMS_PER_FEED = 20;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
  parseTagValue: true,
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function textOf(value: unknown): string | null {
  if (typeof value === "string") {
    const t = value.trim();
    return t === "" ? null : t;
  }
  if (typeof value === "number") return String(value);
  if (isRecord(value)) {
    const inner = value["#text"];
    if (typeof inner === "string") {
      const t = inner.trim();
      return t === "" ? null : t;
    }
    if (typeof inner === "number") return String(inner);
  }
  return null;
}

/** Extract an image URL from RSS namespaces (media:*, enclosure, content HTML). */
function imageOf(item: Record<string, unknown>): string | null {
  const mediaContent = toArray<unknown>(
    (item["media:content"] ?? item["media:thumbnail"]) as
      | unknown
      | unknown[]
      | undefined,
  );
  for (const entry of mediaContent) {
    if (isRecord(entry)) {
      const url = entry["@_url"];
      if (typeof url === "string" && /^https?:\/\//i.test(url)) return url;
    }
    if (typeof entry === "string" && /^https?:\/\//i.test(entry)) return entry;
  }
  const enclosure = item["enclosure"];
  if (isRecord(enclosure)) {
    const url = enclosure["@_url"];
    const type = enclosure["@_type"];
    if (
      typeof url === "string" &&
      /^https?:\/\//i.test(url) &&
      (typeof type !== "string" || type.startsWith("image/"))
    ) {
      return url;
    }
  }
  const encoded = textOf(item["content:encoded"]);
  if (encoded) {
    const m = /<img[^>]+src=["'](https?:\/\/[^"']+)["']/i.exec(encoded);
    if (m?.[1]) return m[1];
  }
  return null;
}

/**
 * Fetch an RSS/Atom feed — or a sitemap `<urlset>` (Fox/Reuters publish
 * article sitemaps instead of per-section RSS) — and return normalized
 * candidate items. Sitemap entries carry no title/image, so page-level
 * OpenGraph data fills those gaps at parse time; entries are sorted
 * newest-first by lastmod when dates exist.
 * Google News proxy feeds keep their proxy links — but note those article
 * URLs need a browser to resolve, so proxy-sourced candidates are expected
 * to fail fetching server-side; prefer direct feeds/sitemaps.
 */
export async function fetchRssItems(feedUrl: string): Promise<RssItem[]> {
  const xml = await fetchText(feedUrl);
  let doc: unknown;
  try {
    doc = parser.parse(xml);
  } catch (err) {
    throw new Error(
      `RSS XML parse failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  if (!isRecord(doc)) throw new Error("RSS XML parse failed: empty document");
  // Sitemap branch: { urlset: { url: [{ loc, lastmod, "news:news": {...} }] } }
  if (isRecord(doc["urlset"])) {
    return parseSitemapUrlset(doc["urlset"] as Record<string, unknown>);
  }
  const rss = isRecord(doc["rss"]) ? doc["rss"] : doc;
  const channel = isRecord(rss["channel"]) ? rss["channel"] : rss;
  const rawItems = toArray<unknown>(
    (channel["item"] ?? channel["entry"]) as unknown | unknown[] | undefined,
  );
  const items: RssItem[] = [];
  for (const raw of rawItems) {
    if (!isRecord(raw)) continue;
    // Atom entries use <link href="..."> instead of <link>text</link>.
    let url = textOf(raw["link"]);
    if (!url && isRecord(raw["link"])) {
      const href = raw["link"]["@_href"];
      if (typeof href === "string") url = href.trim() || null;
    }
    if (!url || !/^https?:\/\//i.test(url)) continue;
    items.push({
      url,
      title: textOf(raw["title"]),
      pubDate: textOf(raw["pubDate"] ?? raw["published"] ?? raw["updated"]),
      imageUrl: imageOf(raw),
    });
    if (items.length >= MAX_ITEMS_PER_FEED) break;
  }
  if (items.length === 0) {
    throw new Error("RSS feed contained no usable items");
  }
  return items;
}

/** Parse a sitemap `<urlset>` into candidate items, newest-first. */
function parseSitemapUrlset(urlset: Record<string, unknown>): RssItem[] {
  const rawUrls = toArray<unknown>(urlset["url"] as unknown | unknown[] | undefined);
  const dated: { item: RssItem; time: number }[] = [];
  for (const raw of rawUrls) {
    if (!isRecord(raw)) continue;
    const url = textOf(raw["loc"]);
    if (!url || !/^https?:\/\//i.test(url)) continue;
    const news = isRecord(raw["news:news"])
      ? (raw["news:news"] as Record<string, unknown>)
      : null;
    const pubDate =
      textOf(news?.["news:publication_date"]) ?? textOf(raw["lastmod"]);
    const time = pubDate ? Date.parse(pubDate) : NaN;
    dated.push({
      item: { url, title: textOf(news?.["news:title"]), pubDate, imageUrl: null },
      time: Number.isNaN(time) ? 0 : time,
    });
  }
  dated.sort((a, b) => b.time - a.time);
  const items = dated.slice(0, MAX_ITEMS_PER_FEED).map((d) => d.item);
  if (items.length === 0) {
    throw new Error("Sitemap contained no usable URLs");
  }
  return items;
}
