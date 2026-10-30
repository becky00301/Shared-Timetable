import assert from "node:assert/strict";
import test from "node:test";
import { fetchNaverDisplayName, naverProfileDisplayName, naverProfilePermissions, syncNaverDisplayName } from "../lib/auth/naver-profile.ts";

const subject = "naver-verified-subject";
const profile = (fields = {}) => ({ resultcode: "00", response: { id: subject, ...fields } });
const user = {
  id: "abcdef12-1234", is_anonymous: false,
  app_metadata: { provider: "custom:naver" },
  identities: [{ provider: "custom:naver", identity_data: { sub: subject } }],
  user_metadata: { name: "NAVER abcdef" }
};

test("permission diagnostics keep only name/nickname flags and discard the echoed token", async () => {
  const result = await naverProfilePermissions("private-test-token", async (url, options) => {
    assert.equal(url, "https://openapi.naver.com/v1/nid/verify?info=true");
    assert.equal(options.headers.Authorization, "Bearer private-test-token");
    assert.equal(options.redirect, "error");
    return Response.json({ resultcode: "00", response: {
      token: "private-test-token", allowed_profile: "id, name, nickname, email", expire_date: "private"
    } });
  });
  assert.deepEqual(result, { status: "checked", name: true, nickname: true });
  assert.equal(JSON.stringify(result).includes("private"), false);
  assert.deepEqual(await naverProfilePermissions("test", async () => Response.json({
    resultcode: "00", response: { allowed_profile: "id" }
  })), { status: "checked", name: false, nickname: false });
  for (const value of [null, {}, { resultcode: "00", response: { allowed_profile: [] } }]) {
    assert.deepEqual(await naverProfilePermissions("test", async () => Response.json(value)), { status: "unavailable" });
  }
  assert.deepEqual(await naverProfilePermissions("test", async () => { throw new Error("private"); }), { status: "request-failed" });
});

test("prefers nickname, falls back to name, and requires a matching verified subject", () => {
  assert.equal(naverProfileDisplayName(profile({ nickname: " 별명 ", name: "이름" }), subject), "별명");
  assert.equal(naverProfileDisplayName(profile({ nickname: "  ", name: "이름" }), subject), "이름");
  assert.equal(naverProfileDisplayName(profile({ nickname: { bad: true }, name: "이름" }), subject), "이름");
  assert.equal(naverProfileDisplayName(profile({ nickname: "x".repeat(101), name: "이름" }), subject), "이름");
  assert.equal(naverProfileDisplayName(profile({ nickname: "줄\n바꿈", name: "이름" }), subject), "이름");
  assert.equal(naverProfileDisplayName(profile({ nickname: "별명", id: "another-user" }), subject), null);
  for (const payload of [null, [], {}, { resultcode: "024", response: { id: subject, nickname: "별명" } }, profile()]) {
    assert.equal(naverProfileDisplayName(payload, subject), null);
  }
});

test("requests profiles only at NAVER with no caching or redirects and tolerates optional-data failures", async () => {
  const name = await fetchNaverDisplayName("test-provider-token", subject, async (url, options) => {
    assert.equal(url, "https://openapi.naver.com/v1/nid/me");
    assert.equal(options.headers.Authorization, "Bearer test-provider-token");
    assert.equal(options.cache, "no-store");
    assert.equal(options.redirect, "error");
    assert.ok(options.signal instanceof AbortSignal);
    return Response.json(profile({ nickname: "별명", email: "do-not-store@example.com" }));
  });
  assert.equal(name, "별명");
  for (const fetcher of [
    async () => new Response(null, { status: 403 }),
    async () => new Response("invalid json"),
    async () => { throw new Error("timeout"); }
  ]) assert.equal(await fetchNaverDisplayName("test-token", subject, fetcher), null);
});

test("updates old generated names, persists only the chosen display name and preserves existing names when consent is missing", async () => {
  const updates = [];
  const supabase = { auth: { updateUser: async (attributes) => { updates.push(attributes); return { error: null }; } } };
  const fetcher = async () => Response.json(profile({ nickname: "별명", name: "이름", email: "ignore@example.com", mobile: "ignore" }));
  await syncNaverDisplayName(supabase, user, "test-token", fetcher);
  assert.deepEqual(updates, [{ data: { name: "별명" } }]);
  updates.length = 0;
  await syncNaverDisplayName(supabase, { ...user, user_metadata: { name: "이미 있는 이름" } }, "test-token", async () => new Response(null, { status: 403 }));
  assert.deepEqual(updates, []);
  await syncNaverDisplayName(supabase, { ...user, user_metadata: {} }, null, fetcher);
  assert.deepEqual(updates, [{ data: { name: "NAVER abcdef" } }]);
});

test("never sends other providers' tokens to NAVER and does not update guests or unlinked accounts", async () => {
  const unexpected = async () => { assert.fail("unexpected profile request or update"); };
  const supabase = { auth: { updateUser: unexpected } };
  for (const other of [
    { ...user, app_metadata: { provider: "google" } },
    { ...user, is_anonymous: true },
    { ...user, identities: [] },
    { ...user, identities: [{ provider: "email" }] }
  ]) await syncNaverDisplayName(supabase, other, "test-token", unexpected);
});

test("reports safe failure codes so absent consent, mismatched identity and persistence failures are distinguishable", async () => {
  const supabase = { auth: { updateUser: async () => ({ error: null }) } };
  const fetcher = async () => Response.json(profile({ nickname: "별명" }));
  assert.equal(await syncNaverDisplayName(supabase, user, "test-token", fetcher), "synced");
  assert.equal(await syncNaverDisplayName(supabase, user, null, fetcher), "missing-token");
  assert.equal(await syncNaverDisplayName(supabase, {
    ...user, identities: [{ provider: "custom:naver", identity_data: {} }]
  }, "test-token", fetcher), "missing-subject");
  assert.equal(await syncNaverDisplayName(supabase, user, "test-token", async () => Response.json(profile())), "name-not-provided");
  assert.equal(await syncNaverDisplayName(supabase, user, "test-token", async () => Response.json(profile({ id: "other-subject", nickname: "별명" }))), "subject-mismatch");
  assert.equal(await syncNaverDisplayName(supabase, user, "test-token", async () => new Response(null, { status: 403 })), "request-failed");
  assert.equal(await syncNaverDisplayName(supabase, user, "test-token", async () => Response.json({ resultcode: "024" })), "invalid-response");
  assert.equal(await syncNaverDisplayName({ auth: { updateUser: async () => ({ error: { message: "private diagnostic details" } }) } }, user, "test-token", fetcher), "save-failed");
});
