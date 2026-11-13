import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSafeNextPath } from "@/lib/utils/navigation";
import { naverProfilePermissions, restoreChosenDisplayName, syncNaverDisplayName } from "@/lib/auth/naver-profile";
import { AUTH_EVENT_COOKIE, authMethodFromProvider } from "@/lib/analytics";

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
      if (data.user) {
        const status = await syncNaverDisplayName(supabase, data.user, data.session?.provider_token)
          .catch(() => "unexpected-error");
        // Fixed status codes only: never log names, subjects or OAuth tokens.
        if (status !== "skipped") console.info("[naver-profile]", status);
        // Other providers (Google) can also rewrite the name at sign-in.
        else await restoreChosenDisplayName(supabase, data.user).catch(() => null);
        if (status === "name-not-provided" && data.session?.provider_token) {
          console.info("[naver-profile-permissions]", await naverProfilePermissions(data.session.provider_token));
        }
      }
      const response = NextResponse.redirect(`${origin}${next}`);
      if (data.user) {
        // A first sign-in lands within moments of the account's creation.
        const created = Date.parse(data.user.created_at);
        const signedIn = Date.parse(data.user.last_sign_in_at ?? data.user.created_at);
        const kind = Math.abs(signedIn - created) < 60_000 ? "sign_up" : "login";
        const method = authMethodFromProvider(data.user.app_metadata?.provider);
        // Read once by AuthEventTracker on the next page; it holds no
        // personal data.
        response.cookies.set(AUTH_EVENT_COOKIE, `${kind}:${method}`, { path: "/", maxAge: 120, sameSite: "lax" });
      }
      return response;
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
