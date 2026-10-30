import assert from "node:assert/strict";
import test from "node:test";
import { createServerClient } from "@supabase/ssr";
import { getNaverUserinfo } from "../lib/auth/naver-userinfo.ts";

const request = (authorization = "Bearer test-token") => new Request("https://www.planner-together.com/api/auth/naver/userinfo", {
  headers: authorization ? { authorization } : {}
});
const validProfile = { resultcode: "00", response: { id: "naver-user-123", email: "member@example.com" } };
const json = (payload, status = 200) => Response.json(payload, { status });

test("requires a bearer token before contacting NAVER", async () => {
  for (const authorization of ["", "Basic abc", "Bearer", "Bearer abc def"]) {
    const response = await getNaverUserinfo(request(authorization), () => assert.fail("Unexpected network call"));
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
});

test("verifies the token with NAVER and returns only the required identity fields", async () => {
  const response = await getNaverUserinfo(request(), async (url, options) => {
    assert.equal(url, "https://openapi.naver.com/v1/nid/me");
    assert.equal(options.headers.Authorization, "Bearer test-token");
    assert.equal(options.cache, "no-store");
    assert.equal(options.redirect, "error");
    assert.ok(options.signal instanceof AbortSignal);
    return json({ ...validProfile, response: { ...validProfile.response, name: "Private name", mobile: "Private number", email_verified: true } });
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { sub: "naver-user-123", email: "member@example.com", email_verified: false });
});

test("rejects invalid tokens, denied consent, and malformed identity data", async () => {
  const cases = [
    [json({ message: "private upstream details" }, 401), 401],
    [json({ message: "private upstream details" }, 500), 502],
    [json({ resultcode: "024", response: validProfile.response }), 401],
    [json({ resultcode: "00", response: { email: "member@example.com" } }), 502],
    [json({ resultcode: "00", response: { id: "123" } }), 403],
    [json({ resultcode: "00", response: { id: "123", email: "invalid" } }), 403],
    [json(null), 502],
    [new Response("not JSON"), 502]
  ];
  for (const [upstream, expected] of cases) {
    const response = await getNaverUserinfo(request(), async () => upstream);
    assert.equal(response.status, expected);
    const body = await response.text();
    assert.equal(body.includes("private upstream details"), false);
    assert.equal(body.includes("member@example.com"), false);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
});

test("network failures and timeouts never disclose credentials", async () => {
  for (const error of [new Error("test-token"), new DOMException("Timed out", "TimeoutError")]) {
    const response = await getNaverUserinfo(request(), async () => { throw error; });
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { error: "profile_unavailable" });
  }
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
