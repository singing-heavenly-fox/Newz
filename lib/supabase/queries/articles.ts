// Supabase read queries for the website (stored data only, AGENTS.md §5).
// UI reads show ANALYZED articles only: per §18, articles appear on the
// homepage after analyzed_at is set, and per §19 pending detection is based
// on the actual article_analyses row — so the join must yield an analysis.
//
// AGENTS.md §21 gotcha: never `.eq('foreignTable.column', …)` on a joined
// table (broken PostgREST SQL). Fetch the join, filter in JS below.

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  ArticleAnalysisRow,
  ArticleRow,
  SourceRow,
} from "@/lib/supabase/types";
import type {
  Article,
  ArticleAnalysis,
  BiasLabel,
  SentimentLabel,
  Source,
} from "@/lib/types";

const ARTICLE_COLUMNS =
  "id,source_id,original_url,canonical_url,title,image_url,published_at,raw_text,scraped_at,analyzed_at,created_at";
const SOURCE_COLUMNS = "id,name,listing_url,parser_strategy,is_active,logo_url,created_at";
const ANALYSIS_COLUMNS =
  "id,article_id,summary,sentiment_score,sentiment_label,bias_label,left_percentage,center_percentage,right_percentage,bias_score,confidence,framing_notes,loaded_terms,disclaimer,model,created_at";

interface ArticleJoinedRow extends ArticleRow {
  sources: SourceRow | SourceRow[] | null;
  article_analyses: ArticleAnalysisRow | ArticleAnalysisRow[] | null;
}

/** Article PKs are uuids (mock slugs like "city-council-…" never match). */
function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    id,
  );
}
function first<T>(value: T | T[] | null | undefined): T | null {
  // Normalize a to-one embed that PostgREST may return as object or array.
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Runtime guard: is this row a usable article + source + analysis triple? */
function isCompleteTriple(row: ArticleJoinedRow): boolean {
  const source = first(row.sources);
  const analysis = first(row.article_analyses);
  return (
    typeof row.id === "string" &&
    typeof row.title === "string" &&
    isRecord(source) &&
    typeof source["name"] === "string" &&
    isRecord(analysis) &&
    typeof analysis["summary"] === "string"
  );
}

function mapSource(row: SourceRow): Source {
  return {
    id: row.id,
    name: row.name,
    listing_url: row.listing_url,
    logo_url: row.logo_url,
  };
}

/** Excerpt is derived (no excerpt column in schema §7): first ~160 chars. */
export function deriveExcerpt(rawText: string, maxLen = 160): string {
  const flat = rawText.replace(/\s+/g, " ").trim();
  if (flat.length <= maxLen) return flat;
  const cut = flat.slice(0, maxLen);
  const boundary = Math.max(
    cut.lastIndexOf(". "),
    cut.lastIndexOf("! "),
    cut.lastIndexOf("? "),
    cut.lastIndexOf(" "),
  );
  return `${cut.slice(0, boundary > 40 ? boundary + 1 : maxLen).trim()}…`;
}

export function deriveReadMinutes(rawText: string): number {
  const words = rawText.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function mapAnalysis(row: ArticleAnalysisRow): ArticleAnalysis {
  return {
    article_id: row.article_id,
    summary: row.summary,
    sentiment_score: row.sentiment_score,
    sentiment_label: row.sentiment_label as SentimentLabel,
    bias_label: row.bias_label as BiasLabel,
    left_percentage: row.left_percentage,
    center_percentage: row.center_percentage,
    right_percentage: row.right_percentage,
    bias_score: row.bias_score,
    confidence: row.confidence,
    framing_notes: row.framing_notes ?? [],
    loaded_terms: row.loaded_terms ?? [],
    disclaimer: row.disclaimer,
    model: row.model,
    // Embedding lands in §20 (pgvector). Null hides Related until then.
    embedding: null,
  };
}

function mapArticle(row: ArticleJoinedRow): Article | null {
  const source = first(row.sources);
  const analysis = first(row.article_analyses);
  if (!source || !analysis) return null;
  return {
    id: row.id,
    source: mapSource(source),
    original_url: row.original_url,
    canonical_url: row.canonical_url ?? row.original_url,
    title: row.title,
    excerpt: deriveExcerpt(row.raw_text),
    image_url: row.image_url ?? "",
    published_at: row.published_at ?? row.created_at,
    raw_text: row.raw_text,
    read_minutes: deriveReadMinutes(row.raw_text),
    analysis: mapAnalysis(analysis),
  };
}

function dbError(message: string, code: string | undefined, dbMessage: string): Error {
  if (code === "PGRST205") {
    return new Error(
      `${message}: tables missing (PGRST205). Run supabase/schema.sql in ` +
        `Supabase Dashboard → SQL Editor, then reload.`,
    );
  }
  return new Error(`${message}: ${dbMessage}`);
}

async function fetchArticleJoins(): Promise<ArticleJoinedRow[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("articles")
    .select(
      `${ARTICLE_COLUMNS},sources(${SOURCE_COLUMNS}),article_analyses(${ANALYSIS_COLUMNS})`,
    )
    .order("published_at", { ascending: false });
  if (error) throw dbError("Supabase articles read failed", error.code, error.message);
  return (data ?? []) as unknown as ArticleJoinedRow[];
}

/** Analyzed articles, newest first — the homepage feed. */
export async function getArticles(): Promise<Article[]> {
  const rows = await fetchArticleJoins();
  const articles: Article[] = [];
  for (const row of rows) {
    // Analyzed-only + validity filter in JS (never on the joined table).
    if (!isCompleteTriple(row)) continue;
    const article = mapArticle(row);
    if (article) articles.push(article);
  }
  return articles;
}

/** Single analyzed article by id, or null (non-uuid ids can never match). */
export async function getArticleById(id: string): Promise<Article | null> {
  if (!isUuid(id)) return null;
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("articles")
    .select(
      `${ARTICLE_COLUMNS},sources(${SOURCE_COLUMNS}),article_analyses(${ANALYSIS_COLUMNS})`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error)
    throw dbError("Supabase article read failed", error.code, error.message);
  if (!data) return null;
  const row = data as unknown as ArticleJoinedRow;
  if (!isCompleteTriple(row)) return null;
  return mapArticle(row);
}

/** Count of analyzed articles (for the header pill). Inner join keeps it
 *  analyzed-only; head:true returns the count without rows. */
export async function getAnalyzedCount(): Promise<number> {
  const supabase = createServerSupabaseClient();
  const { count, error } = await supabase
    .from("articles")
    .select("id,article_analyses!inner(article_id)", {
      count: "exact",
      head: true,
    });
  if (error)
    throw dbError("Supabase analyzed count failed", error.code, error.message);
  return count ?? 0;
}

/** Ids of analyzed articles (for generateStaticParams). */
export async function getArticleIds(): Promise<string[]> {
  const articles = await getArticles();
  return articles.map((a) => a.id);
}

// TODO(§20 pgvector): replace with cosine-similarity query
// `getRelatedArticles(articleId, embedding)` over article_analyses.embedding
// (order by `<=>`, limit 5, hide section when embedding is null).
export async function getRelatedArticles(
  _articleId: string,
  _limit = 5,
): Promise<Article[]> {
  void _articleId;
  void _limit;
  return [];
}
