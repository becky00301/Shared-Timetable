import { NextResponse } from "next/server";
import { exchangeCodeForTokens, fetchGoogleEmail, saveTokens } from "@/lib/google/oauth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");

  let next = "/dashboard";
  if (stateParam) {
    try {
      const parsed = JSON.parse(Buffer.from(stateParam, "base64url").toString()) as { next?: string };
      // Only allow same-site paths back.
      if (parsed.next?.startsWith("/")) next = parsed.next;
    } catch {
      // keep the default
    }
  }

  const fail = (reason: string) =>
    NextResponse.redirect(`${origin}${next}?google=${encodeURIComponent(reason)}`);

  if (!code) return fail(searchParams.get("error") ?? "no-code");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!user) return NextResponse.redirect(`${origin}/login?next=${encodeURIComponent(next)}`);

  try {
    const tokens = await exchangeCodeForTokens(code, `${origin}/api/google/callback`);
    const email = await fetchGoogleEmail(tokens.access_token);
    await saveTokens(user.id, tokens, email);
    return NextResponse.redirect(`${origin}${next}?google=connected`);
  } catch (error) {
    console.error(error);
    return fail(error instanceof Error ? error.message : "connect-failed");
  }
}
