// Daily analysis cron — internal only (Vercel Cron sends GET).
// GET /api/cron/analyze-free — protected by CRON_SECRET in production;
// check skipped outside production for local testing.
// Runs after the scrape cron; picks up all pending articles (AGENTS.md §19).

import "server-only";

import { DEFAULT_ANALYSIS_MODEL, runAnalysis } from "@/lib/analysis/pipeline";

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
  let analysis: Awaited<ReturnType<typeof runAnalysis>>;
  try {
    analysis = await runAnalysis({});
  } catch (err) {
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
  console.log(`[cron-free] analyze step done: ${analysis.status}`);
  return Response.json(
    { analysis },
    { status: analysis.status === "failed" ? 500 : 200 },
  );
}
