import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  const fail = (reason: string) =>
    NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(reason)}`);

  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail("supabase-unconfigured");

  // PKCE code flow (default for @supabase/ssr)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    return fail(error.message);
  }

  // Magic link / OTP token_hash flow (works across devices)
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    return fail(error.message);
  }

  return fail("no-code-or-token");
}
