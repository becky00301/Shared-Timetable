"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

export function createSupabaseBrowserClient() {
  const { url, key, configured } = getSupabasePublicConfig();

  if (!configured) {
    return null;
  }

  return createBrowserClient<Database>(url, key);
}
