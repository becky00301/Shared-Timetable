import { NextResponse } from "next/server";
import { getSupabasePublicConfig } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export function GET() {
  const { url, key, configured } = getSupabasePublicConfig();

  return NextResponse.json(
    {
      enabled: configured,
      url,
      anonKey: key
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
