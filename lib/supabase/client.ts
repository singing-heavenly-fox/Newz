// Browser (client-component) Supabase client — anon key only.
// Only NEXT_PUBLIC_* values may reach browser code (AGENTS.md §21).
// Never import the service-role client here.

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/types";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Copy .env.example to .env.local and fill in the values.",
    );
  }
  return createBrowserClient<Database>(url, anonKey);
}
