import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSafeNextPath } from "@/lib/utils/navigation";
import { isEmailLessNaverAccount, naverAccountLabel } from "@/lib/auth/social-account";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = getSafeNextPath(searchParams.get("next"));

  const fail = (reason: string) =>
    NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(reason)}`);

  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail("supabase-unconfigured");

  // OAuth providers can require an additional email confirmation. Preserve
  // that stable error code so the login screen can explain the next step.
  if (searchParams.get("error")) {
    return fail(searchParams.get("error_code") === "provider_email_needs_verification"
      ? "provider_email_needs_verification"
      : "oauth-failed");
  }

  // PKCE code flow (default for @supabase/ssr)
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // This is only a display name. Access rights continue to use auth.uid().
      if (data.user && isEmailLessNaverAccount(data.user) && !data.user.user_metadata.name) {
        await supabase.auth.updateUser({ data: { name: naverAccountLabel(data.user.id) } }).catch(() => {});
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
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
