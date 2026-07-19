import { NextResponse } from "next/server";
import { buildAuthUrl, getGoogleConfig } from "@/lib/google/oauth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const next = searchParams.get("next") ?? "/dashboard";

  if (!getGoogleConfig().configured) {
    return NextResponse.redirect(`${origin}${next}?google=not-configured`);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!user) return NextResponse.redirect(`${origin}/login?next=${encodeURIComponent(next)}`);

  // state carries where to return to; the session cookie identifies the user.
  const state = Buffer.from(JSON.stringify({ next })).toString("base64url");
  const redirectUri = `${origin}/api/google/callback`;
  return NextResponse.redirect(buildAuthUrl(redirectUri, state));
}
