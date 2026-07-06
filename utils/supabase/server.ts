import { createServerClient } from "@supabase/ssr";
import type { cookies } from "next/headers";
import { getSupabasePublicConfig } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

export const createClient = (cookieStore: Awaited<ReturnType<typeof cookies>>) => {
  const { url, key, configured } = getSupabasePublicConfig();

  if (!configured) {
    throw new Error("Missing Supabase public environment variables.");
  }

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot set cookies; route handlers can.
        }
      }
    }
  });
};
