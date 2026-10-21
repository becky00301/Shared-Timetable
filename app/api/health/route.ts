import { NextResponse } from "next/server";
import { getSupabasePublicConfig } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

/** Long enough to cross a region, short enough that the check itself never
    becomes the thing that hangs. */
const PROBE_TIMEOUT_MS = 3000;

/**
 * Checking that the environment variables exist says nothing about whether
 * the database is answering — this endpoint reported "ok" through an outage
 * where Supabase was paused and nobody could log in. So it asks.
 *
 * Any HTTP reply counts as reachable: the point is whether the service is
 * there, not whether this particular key is allowed to do anything.
 */
async function probeSupabase(url: string, key: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  const startedAt = Date.now();
  try {
    const response = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: key },
      signal: controller.signal,
      cache: "no-store"
    });
    return { reachable: true, detail: `http-${response.status}`, ms: Date.now() - startedAt };
  } catch {
    return { reachable: false, detail: "unreachable", ms: Date.now() - startedAt };
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  const { url, key, configured } = getSupabasePublicConfig();

  if (!configured) {
    return NextResponse.json(
      { status: "degraded", checks: { app: "ok", supabase: "missing-public-env" } },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const probe = await probeSupabase(url, key);
  const status = probe.reachable ? "ok" : "degraded";

  return NextResponse.json(
    {
      status,
      checks: {
        app: "ok",
        supabase: probe.reachable ? "reachable" : "unreachable",
        supabaseDetail: probe.detail,
        supabaseLatencyMs: probe.ms
      }
    },
    { status: probe.reachable ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}
