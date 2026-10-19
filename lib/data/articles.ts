import { hasSupabaseEnv } from "@/lib/supabase/server";
import {
  getAnalyzedCount as getSupabaseAnalyzedCount,
  getArticleById as getSupabaseArticleById,
  getArticleIds as getSupabaseArticleIds,
  getArticles as getSupabaseArticles,
  getRelatedArticles as getSupabaseRelatedArticles,
} from "@/lib/supabase/queries/articles";
import { mockArticles } from "@/lib/mock/articles";
import type { Article } from "@/lib/types";

/**
 * Data-access swap point (AGENTS.md §5): Supabase reads when configured,
 * mock TS data only when Supabase env is absent (pre-setup dev mode).
 * No other file changes when the source flips.
 */

let warnedFallback = false;

function shouldUseSupabase(): boolean {
  if (hasSupabaseEnv()) return true;
  if (!warnedFallback) {
    warnedFallback = true;
    console.warn(
      "[newz] Supabase env absent (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY) — " +
        "serving mock articles. Set .env.local for live data.",
    );
  }
  return false;
}

export async function getArticles(): Promise<Article[]> {
  if (shouldUseSupabase()) return getSupabaseArticles();
  return [...mockArticles].sort(
    (a, b) => +new Date(b.published_at) - +new Date(a.published_at),
  );
}

export async function getArticleById(id: string): Promise<Article | null> {
  if (shouldUseSupabase()) return getSupabaseArticleById(id);
  return mockArticles.find((a) => a.id === id) ?? null;
}

export async function getArticleIds(): Promise<string[]> {
  if (shouldUseSupabase()) return getSupabaseArticleIds();
  return mockArticles.map((a) => a.id);
}

/** Live analyzed-article count (header pill); mock size when env absent. */
export async function getAnalyzedCount(): Promise<number> {
  if (shouldUseSupabase()) return getSupabaseAnalyzedCount();
  return mockArticles.filter((a) => a.analysis).length;
}

/** TODO(§20 pgvector): live cosine-similarity related articles. */
export async function getRelatedArticles(
  articleId: string,
  limit = 5,
): Promise<Article[]> {
  if (shouldUseSupabase()) return getSupabaseRelatedArticles(articleId, limit);
  const current = mockArticles.find((a) => a.id === articleId);
  if (!current?.analysis?.embedding) return [];
  return mockArticles
    .filter((a) => a.id !== articleId && a.analysis)
    .slice(0, limit);
}
