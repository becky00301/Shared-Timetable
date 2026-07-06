import { NextResponse } from "next/server";
import { getSupabasePublicConfig } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export function GET() {
  const { configured } = getSupabasePublicConfig();
  const status = configured ? "ok" : "degraded";

  return NextResponse.json(
    {
      status,
      checks: {
        app: "ok",
        supabase: configured ? "configured" : "missing-public-env"
      }
    },
    {
      status: configured ? 200 : 503,
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
