// AI analysis orchestration — SERVER ONLY. Never import from browser code.
// Implements AGENTS.md §19: pending-analysis check, batching, validation,
// save-only-valid, analyzed_at-on-success, run logging.

import "server-only";

import { generateText, Output } from "ai";
import { google } from "@ai-sdk/google";

import { createServiceSupabaseClient } from "@/lib/supabase/service";
import {
  ANALYSIS_INSTRUCTIONS,
  buildAnalysisPrompt,
  buildRetryHint,
} from "@/lib/analysis/prompt";
import { AnalysisOutputSchema } from "@/lib/analysis/schema";
import type { AnalysisOutput } from "@/lib/analysis/schema";

export const DEFAULT_ANALYSIS_MODEL = "gemini-3.5-flash-lite";
const DEFAULT_BATCH_SIZE = 5;
const MAX_BATCH_SIZE = 10;
const PAGE_SIZE = 100;
const MAX_ERRORS_KEPT = 10;

export interface AnalysisRunError {
  articleId: string;
  error: string;
}

/** Final summary object, logged to console and the logs table. */
export interface AnalysisSummary {
  status: "completed" | "partial" | "failed";
  pendingFound: number;
  analyzed: number;
  skipped: number;
  failed: number;
  totalDurationMs: number;
  model: string;
  errors: AnalysisRunError[];
}

export interface RunAnalysisOptions {
  /** Max articles to analyze this call (full runs omit it = all pending). */
  limit?: number;
  /** Analyze only these article IDs (still pending-only; rest skipped). */
  articleIds?: string[];
}

function batchSize(): number {
  const raw = Number(process.env.ANALYSIS_BATCH_SIZE ?? DEFAULT_BATCH_SIZE);
  if (!Number.isFinite(raw)) return DEFAULT_BATCH_SIZE;
  return Math.min(Math.max(Math.floor(raw), 1), MAX_BATCH_SIZE);
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

interface PendingRow {
  id: string;
  title: string;
  raw_text: string;
  article_analyses: unknown;
}

function hasAnalysis(value: unknown): boolean {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

async function writeLog(
  level: string,
  message: string,
  meta: Record<string, unknown> | null,
): Promise<void> {
  try {
    const supabase = createServiceSupabaseClient();
    await supabase.from("logs").insert({
      level,
      source: "analyze",
      message,
      meta,
    });
  } catch (err) {
    console.error(`[analyze] log write failed: ${errorMessage(err)}`);
  }
}

/** One model call. Throws on transport or schema-validation failure. */
async function analyzeOnce(
  title: string,
  rawText: string,
  retryHint: string | null,
): Promise<AnalysisOutput> {
  const prompt =
    buildAnalysisPrompt(title, rawText) + (retryHint ? `\n\n${retryHint}` : "");
  const { output } = await generateText({
    model: google(DEFAULT_ANALYSIS_MODEL),
    instructions: ANALYSIS_INSTRUCTIONS,
    prompt,
    output: Output.object({ schema: AnalysisOutputSchema }),
    temperature: 0.2,
    maxRetries: 0,
    maxOutputTokens: 1500,
  });
  return output;
}

/** Analyze with exactly one retry (hint carries the first failure). */
async function analyzeWithRetry(
  title: string,
  rawText: string,
): Promise<AnalysisOutput> {
  try {
    return await analyzeOnce(title, rawText, null);
  } catch (first) {
    const hint = buildRetryHint(errorMessage(first));
    return await analyzeOnce(title, rawText, hint);
  }
}

function failedSummary(
  reason: string,
  totalDurationMs: number,
): AnalysisSummary {
  return {
    status: "failed",
    pendingFound: 0,
    analyzed: 0,
    skipped: 0,
    failed: 0,
    totalDurationMs,
    model: DEFAULT_ANALYSIS_MODEL,
    errors: [{ articleId: "-", error: reason }],
  };
}

export async function runAnalysis(
  options: RunAnalysisOptions = {},
): Promise<AnalysisSummary> {
  const t0 = Date.now();
  const size = batchSize();
  const limit =
    typeof options.limit === "number" && Number.isFinite(options.limit)
      ? Math.max(Math.floor(options.limit), 1)
      : null;

  console.log(
    `[analyze] run started (batch=${size}${limit ? `, limit=${limit}` : ""})`,
  );
  await writeLog("info", "analyze started", {
    batchSize: size,
    limit,
    articleIds: options.articleIds ?? null,
  });

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    const summary = failedSummary(
      "missing-google-key: set GOOGLE_GENERATIVE_AI_API_KEY in .env.local (free key, no card: https://aistudio.google.com/apikey) and restart the dev server",
      Date.now() - t0,
    );
    console.error(`[analyze] ${summary.errors[0]?.error}`);
    await writeLog("error", "analyze failed: missing GOOGLE_GENERATIVE_AI_API_KEY", null);
    return summary;
  }

  const summary: AnalysisSummary = {
    status: "completed",
    pendingFound: 0,
    analyzed: 0,
    skipped: 0,
    failed: 0,
    totalDurationMs: 0,
    model: DEFAULT_ANALYSIS_MODEL,
    errors: [],
  };
  const pushError = (articleId: string, error: string): void => {
    summary.failed += 1;
    if (summary.errors.length < MAX_ERRORS_KEPT) {
      summary.errors.push({ articleId, error });
    }
  };

  const processOne = async (row: PendingRow): Promise<void> => {
    try {
      const result = await analyzeWithRetry(row.title, row.raw_text);
      const supabase = createServiceSupabaseClient();
      const { error: insertError } = await supabase
        .from("article_analyses")
        .insert({
          article_id: row.id,
          summary: result.summary,
          sentiment_score: result.sentimentScore,
          sentiment_label: result.sentimentLabel,
          bias_label: result.politicalFramingLabel,
          left_percentage: result.leftPercentage,
          center_percentage: result.centerPercentage,
          right_percentage: result.rightPercentage,
          bias_score: (result.rightPercentage - result.leftPercentage) / 100,
          confidence: result.confidence,
          framing_notes: result.framingNotes,
          loaded_terms: result.loadedTerms,
          disclaimer: result.disclaimer,
          model: DEFAULT_ANALYSIS_MODEL,
        });
      if (insertError) {
        // Unique-violation race (analyzed concurrently) → already done.
        if (insertError.code === "23505") {
          summary.skipped += 1;
          return;
        }
        throw new Error(insertError.message);
      }
      const { error: updateError } = await supabase
        .from("articles")
        .update({ analyzed_at: new Date().toISOString() })
        .eq("id", row.id);
      if (updateError) throw new Error(updateError.message);
      summary.analyzed += 1;
      console.log(`[analyze] analyzed ${row.id} (${result.politicalFramingLabel}/${result.sentimentLabel})`);
    } catch (err) {
      const message = errorMessage(err);
      pushError(row.id, message);
      console.error(`[analyze] failed ${row.id}: ${message}`);
    }
  };

  const remaining = (): boolean => limit === null || summary.analyzed + summary.failed < limit;

  try {
    if (options.articleIds && options.articleIds.length > 0) {
      const supabase = createServiceSupabaseClient();
      const { data, error } = await supabase
        .from("articles")
        .select("id,title,raw_text,article_analyses(article_id)")
        .in("id", options.articleIds);
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as unknown as PendingRow[];
      for (const row of rows) {
        if (hasAnalysis(row.article_analyses)) {
          summary.skipped += 1;
          continue;
        }
        summary.pendingFound += 1;
        if (!remaining()) break;
        await processOne(row);
      }
    } else {
      // Full run: page the whole table, batch, continue until exhausted.
      let offset = 0;
      for (;;) {
        const supabase = createServiceSupabaseClient();
        const { data, error } = await supabase
          .from("articles")
          .select("id,title,raw_text,article_analyses(article_id)")
          .order("created_at", { ascending: true })
          .range(offset, offset + PAGE_SIZE - 1);
        if (error) throw new Error(error.message);
        const rows = (data ?? []) as unknown as PendingRow[];
        if (rows.length === 0) break;
        offset += rows.length;
        const pending = rows.filter((r) => !hasAnalysis(r.article_analyses));
        summary.pendingFound += pending.length;
        for (let i = 0; i < pending.length; i += size) {
          const batch = pending.slice(i, i + size);
          for (const row of batch) {
            if (!remaining()) break;
            await processOne(row);
          }
          console.log(
            `[analyze] batch done (analyzed=${summary.analyzed}, failed=${summary.failed}, skipped=${summary.skipped})`,
          );
          if (!remaining()) break;
        }
        if (!remaining()) break;
        if (rows.length < PAGE_SIZE) break;
      }
    }
  } catch (err) {
    const message = errorMessage(err);
    console.error(`[analyze] run error: ${message}`);
    await writeLog("error", `analyze run error: ${message}`, null);
    if (summary.analyzed === 0) {
      return {
        ...summary,
        status: "failed",
        totalDurationMs: Date.now() - t0,
        errors: [{ articleId: "-", error: message }, ...summary.errors].slice(
          0,
          MAX_ERRORS_KEPT,
        ),
      };
    }
  }

  summary.totalDurationMs = Date.now() - t0;
  if (summary.analyzed === 0 && summary.failed > 0) {
    summary.status = "failed";
  } else if (summary.failed > 0) {
    summary.status = "partial";
  }
  console.log(`[analyze] run ${summary.status}:`, JSON.stringify(summary));
  await writeLog(
    summary.status === "failed" ? "error" : "info",
    `analyze ${summary.status}`,
    summary as unknown as Record<string, unknown>,
  );
  return summary;
}
