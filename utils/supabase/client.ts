import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

export const createClient = () => {
  const { url, key, configured } = getSupabasePublicConfig();

  if (!configured) {
    throw new Error("Missing Supabase public environment variables.");
  }

  return createBrowserClient<Database>(url, key);
};
