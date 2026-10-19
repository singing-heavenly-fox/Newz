// Manual free scrape trigger — thin route handler only (AGENTS.md §5).
// POST /api/scrape-free — requires x-biasly-admin-secret (AGENTS.md §15).

import { runFreeScrape } from "@/lib/free-scrape/pipeline";
import { MAX_LIMIT_PER_SOURCE } from "@/lib/free-scrape/types";

function unauthorized(): Response {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

interface ScrapeRequestBody {
  sourceIds?: unknown;
  limitPerSource?: unknown;
}

export async function POST(req: Request): Promise<Response> {
  const secret = process.env.BIASLY_ADMIN_SECRET;
  const provided = req.headers.get("x-biasly-admin-secret");
  if (!secret || !provided || provided !== secret) {
    return unauthorized();
  }

  let body: ScrapeRequestBody = {};
  try {
    body = (await req.json()) as ScrapeRequestBody;
  } catch {
    body = {};
  }

  const sourceIds = Array.isArray(body.sourceIds)
    ? body.sourceIds.filter((v): v is string => typeof v === "string")
    : undefined;
  const rawLimit =
    typeof body.limitPerSource === "number" ? body.limitPerSource : 5;
  const limitPerSource = Math.min(
    Math.max(Math.floor(rawLimit), 1),
    MAX_LIMIT_PER_SOURCE,
  );

  const summary = await runFreeScrape({ sourceIds, limitPerSource });
  return Response.json(summary, {
    status: summary.status === "failed" ? 500 : 200,
  });
}
