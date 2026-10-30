import assert from "node:assert/strict";
import test from "node:test";
import { createServerClient } from "@supabase/ssr";
import { getSocialOnlyProvider, hasRecentOAuthLogin, isEmailLessNaverAccount, naverAccountLabel } from "../lib/auth/social-account.ts";
import { naverProfileConsentRequest } from "../lib/auth/naver-profile-consent.ts";

const naver = { id: "abcdef12-1234", email: "", identities: [{ provider: "custom:naver" }], is_anonymous: false };

test("profile import explicitly requests NAVER re-consent and returns to the account with PKCE", async () => {
  const supabase = createServerClient("https://example.supabase.co", "test-publishable-key", {
    cookies: { getAll: () => [], setAll: () => {} }
  });
  const request = naverProfileConsentRequest("https://www.planner-together.com");
  const { data, error } = await supabase.auth.signInWithOAuth({
    ...request, options: { ...request.options, skipBrowserRedirect: true }
  });
  assert.equal(error, null);
  const authorize = new URL(data.url);
  assert.equal(authorize.searchParams.get("provider"), "custom:naver");
  assert.equal(authorize.searchParams.get("prompt"), "consent");
  assert.equal(authorize.searchParams.has("auth_type"), false);
  assert.equal(authorize.searchParams.get("code_challenge_method"), "s256");
  const callback = new URL(authorize.searchParams.get("redirect_to"));
  assert.equal(callback.origin, "https://www.planner-together.com");
  assert.equal(callback.pathname, "/auth/callback");
  assert.equal(callback.searchParams.get("next"), "/account");
});

test("only OAuth identities suppress password management; Gmail email signups and linked email identities retain it", () => {
  const google = { ...naver, email: "member@gmail.com", identities: [{ provider: "google" }] };
  assert.equal(getSocialOnlyProvider(google), "google");
  assert.equal(getSocialOnlyProvider({ ...google, email: "member@company.example" }), "google");
  assert.equal(getSocialOnlyProvider({ ...google, identities: [{ provider: "email" }] }), null);
  assert.equal(getSocialOnlyProvider({ ...google, identities: [{ provider: "email" }, { provider: "google" }] }), null);
  assert.equal(getSocialOnlyProvider({ ...google, identities: [], user_metadata: { provider: "google" } }), null);
  assert.equal(getSocialOnlyProvider({ ...google, identities: undefined }), null);
  assert.equal(getSocialOnlyProvider({ ...google, is_anonymous: true }), null);
  assert.equal(getSocialOnlyProvider(naver), "custom:naver");
  assert.equal(getSocialOnlyProvider({ ...naver, identities: [{ provider: "custom:naver" }, { provider: "email" }] }), null);
});

test("email-less NAVER accounts are members; guests and unrelated accounts are not eligible", () => {
  assert.equal(isEmailLessNaverAccount(naver), true);
  assert.equal(isEmailLessNaverAccount({ ...naver, email: null }), true);
  assert.equal(isEmailLessNaverAccount({ ...naver, is_anonymous: true }), false);
  assert.equal(isEmailLessNaverAccount({ ...naver, email: "member@example.com" }), false);
  assert.equal(isEmailLessNaverAccount({ ...naver, identities: [{ provider: "google" }] }), false);
  assert.equal(isEmailLessNaverAccount({ id: naver.id, user_metadata: { provider: "custom:naver" } }), false);
  assert.equal(isEmailLessNaverAccount(null), false);
  assert.equal(naverAccountLabel(naver.id), "NAVER abcdef");
});

test("account deletion requires a verified matching subject and a recent OAuth authentication", () => {
  const now = 1_800_000_000;
  const claims = (method = "oauth", timestamp = now - 1) => ({ sub: naver.id, amr: [{ method, timestamp }] });
  assert.equal(hasRecentOAuthLogin(claims(), naver.id, now), true);
  assert.equal(hasRecentOAuthLogin(claims("oauth", now - 299), naver.id, now), true);
  assert.equal(hasRecentOAuthLogin(claims("oauth", now - 300), naver.id, now), false);
  assert.equal(hasRecentOAuthLogin(claims("oauth", now + 1), naver.id, now), false);
  assert.equal(hasRecentOAuthLogin(claims("password"), naver.id, now), false);
  assert.equal(hasRecentOAuthLogin(claims("anonymous"), naver.id, now), false);
  assert.equal(hasRecentOAuthLogin(claims("oauth", "1800000000"), naver.id, now), false);
  assert.equal(hasRecentOAuthLogin(claims("oauth", NaN), naver.id, now), false);
  assert.equal(hasRecentOAuthLogin({ ...claims(), sub: "another-user" }, naver.id, now), false);
  assert.equal(hasRecentOAuthLogin({ sub: naver.id, amr: [null, "oauth", {}] }, naver.id, now), false);
  assert.equal(hasRecentOAuthLogin(null, naver.id, now), false);
  // A newly refreshed JWT must not make an old login recent again.
  assert.equal(hasRecentOAuthLogin({ ...claims("oauth", now - 3600), iat: now }, naver.id, now), false);
});

test("Supabase starts both social providers with PKCE and preserves the return destination", async () => {
  for (const provider of ["google", "custom:naver"]) {
    let storedCookies = [];
    const supabase = createServerClient("https://example.supabase.co", "test-publishable-key", {
      cookies: {
        getAll: () => storedCookies,
        setAll: (cookies) => { storedCookies = cookies; }
      }
    });
    const redirectTo = "https://www.planner-together.com/auth/callback?next=%2Fdashboard%3Fclaim%3Dexample";
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider, options: { redirectTo, skipBrowserRedirect: true }
    });
    assert.equal(error, null);
    const authorize = new URL(data.url);
    assert.equal(authorize.origin, "https://example.supabase.co");
    assert.equal(authorize.searchParams.get("provider"), provider);
    assert.equal(authorize.searchParams.get("redirect_to"), redirectTo);
    assert.equal(authorize.searchParams.get("code_challenge_method"), "s256");
    assert.ok(authorize.searchParams.get("code_challenge"));
    assert.ok(storedCookies.some((cookie) => cookie.name.includes("code-verifier")));
  }
});
