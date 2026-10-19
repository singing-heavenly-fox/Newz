// Manual AI analysis trigger — thin route handler only (AGENTS.md §5).
// POST /api/analyze — requires x-biasly-admin-secret (AGENTS.md §15).
// Default processes ALL pending articles; { limit } and/or { articleIds }
// narrow the run.

import { runAnalysis } from "@/lib/analysis/pipeline";

function unauthorized(): Response {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

interface AnalyzeRequestBody {
  limit?: unknown;
  articleIds?: unknown;
}

export async function POST(req: Request): Promise<Response> {
  const secret = process.env.BIASLY_ADMIN_SECRET;
  const provided = req.headers.get("x-biasly-admin-secret");
  if (!secret || !provided || provided !== secret) {
    return unauthorized();
  }

  let body: AnalyzeRequestBody = {};
  try {
    body = (await req.json()) as AnalyzeRequestBody;
  } catch {
    body = {};
  }

  const limit =
    typeof body.limit === "number" && Number.isFinite(body.limit)
      ? Math.max(Math.floor(body.limit), 1)
      : undefined;
  const articleIds = Array.isArray(body.articleIds)
    ? body.articleIds.filter((v): v is string => typeof v === "string")
    : undefined;

  const summary = await runAnalysis({ limit, articleIds });
  if (summary.status === "failed") {
    const hint =
      summary.errors[0]?.error.includes("missing-google-key") === true
        ? " Get a free key (no card) at https://aistudio.google.com/apikey, set GOOGLE_GENERATIVE_AI_API_KEY in .env.local and restart the dev server."
        : "";
    return Response.json(
      { ...summary, hint: hint === "" ? undefined : hint.trim() },
      { status: 500 },
    );
  }
  return Response.json(summary);
}
