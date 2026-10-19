// Service-role Supabase client — SERVER ONLY (pipeline writes: scraping,
// analysis, scheduler, logs). Bypasses RLS.
//
// NEVER import this module from app/ or components/ (browser-reachable).
// The `server-only` import makes such misuse a build error.

import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export function createServiceSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. " +
        "Set them in .env.local (server only, never NEXT_PUBLIC_).",
    );
  }
  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
