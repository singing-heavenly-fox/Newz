// Daily scrape cron — internal only (Vercel Cron sends GET).
// GET /api/cron/scrape-free — protected by CRON_SECRET in production;
// check skipped outside production for local testing.
// Kept separate from analysis so each step fits Hobby plan limits.

import "server-only";

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
  const scrape = await runFreeScrape({ limitPerSource: 2 });
  return Response.json(
    { scrape },
    { status: scrape.status === "failed" ? 500 : 200 },
  );
}
