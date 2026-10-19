// Polite article-HTML fetcher — SERVER ONLY. Never import from browser code.

import "server-only";

export interface FetchedPage {
  html: string;
  finalUrl: string;
}

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 (NewzBot/1.0; +free-rss-pipeline)";

const FETCH_TIMEOUT_MS = 15_000;
const MAX_HTML_BYTES = 3_000_000;

/** Private/local hosts must never be fetched (SSRF hygiene). */
export function isFetchableUrl(raw: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return false;
  }
  if (/^10\./.test(host) || /^192\.168\./.test(host)) return false;
  const m172 = /^172\.(1[6-9]|2\d|3[01])\./.exec(host);
  if (m172) return false;
  return true;
}

export async function fetchHtml(url: string): Promise<FetchedPage> {
  if (!isFetchableUrl(url)) {
    throw new Error(`Refused to fetch non-public URL: ${url}`);
  }
  const res = await fetch(url, {
    headers: {
      "user-agent": BROWSER_UA,
      accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType !== "" && !/html|xml/i.test(contentType)) {
    throw new Error(`Unexpected content-type ${contentType} for ${url}`);
  }
  const html = await res.text();
  if (html.length > MAX_HTML_BYTES) {
    throw new Error(`Page too large (${html.length} chars) for ${url}`);
  }
  return { html, finalUrl: res.url || url };
}

/** Fetch raw text (RSS XML). Same UA + timeout policy as HTML. */
export async function fetchText(url: string): Promise<string> {
  if (!isFetchableUrl(url)) {
    throw new Error(`Refused to fetch non-public URL: ${url}`);
  }
  const res = await fetch(url, {
    headers: { "user-agent": BROWSER_UA, accept: "application/rss+xml, application/xml, text/xml, */*" },
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  const text = await res.text();
  if (text.length > MAX_HTML_BYTES) {
    throw new Error(`Feed too large (${text.length} chars) for ${url}`);
  }
  return text;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
