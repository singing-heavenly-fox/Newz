// Server-side Supabase read client (Server Components, Route Handlers).
// Anon key only — respects RLS. Service-role writes live in service.ts.
//
// Deliberately built on plain `createClient` (no next/headers cookies):
// Newz uses Clerk for auth, not Supabase Auth, so there is no Supabase
// session to sync — and avoiding cookies() keeps pages statically
// prerenderable instead of forcing dynamic rendering.

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function createServerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Copy .env.example to .env.local and fill in the values.",
    );
  }
  return createSupabaseClient<Database>(url, anonKey);
}
