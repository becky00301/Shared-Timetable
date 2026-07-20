"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

// Cached so the identity is stable across renders — components put this in
// useEffect dependency arrays, and a fresh client each render would tear down
// and re-create auth subscriptions on every paint.
let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createSupabaseBrowserClient() {
  const { url, key, configured } = getSupabasePublicConfig();

  if (!configured) {
    return null;
  }

  if (!client) {
    client = createBrowserClient<Database>(url, key);
  }
  return client;
}
