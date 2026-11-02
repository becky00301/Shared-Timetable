import { NextResponse } from "next/server";
import { fetchLinkPreview, parseTarget } from "@/lib/link-preview";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Reads a page's own preview tags (og:title, og:image — what KakaoTalk and
 * Slack read) so a note can show the link as a card.
 *
 * The server fetches addresses people type, so it guards against being
 * pointed inward: signed-in callers only, http(s) on standard ports, every
 * hop's host resolved and refused if it lands on a private, loopback or
 * link-local address, redirects followed by hand so each one is checked, a
 * short timeout, and only the start of the body read.
 */
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "not-configured" }, { status: 500 });
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "login-required" }, { status: 401 });

  const target = parseTarget(new URL(request.url).searchParams.get("url"));
  if (!target) return NextResponse.json({ error: "bad-url" }, { status: 400 });

  const preview = await fetchLinkPreview(target);
  if (!preview) return NextResponse.json({ error: "unreachable" }, { status: 422 });
  return NextResponse.json(preview, { headers: { "Cache-Control": "private, max-age=3600" } });
}
