// Automatic hourly free pipeline — internal only (Vercel Cron sends GET).
// GET /api/cron/pipeline-free — protected by CRON_SECRET in production;
// the secret check is skipped outside production for local testing.
// CRON_SECRET is injected by Vercel; never add it to .env.local.

import "server-only";

import { DEFAULT_ANALYSIS_MODEL, runAnalysis } from "@/lib/analysis/pipeline";
import { runFreeScrape } from "@/lib/free-scrape/pipeline";

function unauthorized(): Response {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(req: Request): Promise<Response> {
  if (process.env.NODE_ENV === "production") {
    const secret = process.env.CRON_SECRET;
    const auth = req.headers.get("authorization");
    if (!secret || auth !== `Bearer ${secret}`) {
      return unauthorized();
    }
  }

  // Step one: free scrape (never throws wholesale — returns a summary).
  // Smaller per-source limit than manual runs to fit serverless timeouts.
  let scrape: Awaited<ReturnType<typeof runFreeScrape>>;
  try {
    scrape = await runFreeScrape({ limitPerSource: 3 });
  } catch (err) {
    console.error(
      `[cron-free] scrape step threw: ${err instanceof Error ? err.message : String(err)}`,
    );
    scrape = {
      status: "failed",
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
  }

  // Step two: AI analysis of all pending articles (AGENTS.md §19).
  // Always runs, even if step one failed — pre-existing unanalyzed
  // articles may be waiting.
  let analysis: Awaited<ReturnType<typeof runAnalysis>>;
  try {
    analysis = await runAnalysis({});
  } catch (err) {
    console.error(
      `[cron-free] analysis step threw: ${err instanceof Error ? err.message : String(err)}`,
    );
    analysis = {
      status: "failed",
      pendingFound: 0,
      analyzed: 0,
      skipped: 0,
      failed: 0,
      totalDurationMs: 0,
      model: DEFAULT_ANALYSIS_MODEL,
      errors: [
        { articleId: "-", error: err instanceof Error ? err.message : String(err) },
      ],
    };
  }
  console.log(`[cron-free] pipeline done: scrape=${scrape.status}, analysis=${analysis.status}`);

  return Response.json({ scrape, analysis });
}
