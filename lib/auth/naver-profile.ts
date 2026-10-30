import type { SupabaseClient, User } from "@supabase/supabase-js";

type ProfileResult =
  | { status: "found"; name: string }
  | { status: "invalid-response" | "subject-mismatch" | "name-not-provided" | "request-failed" };

function displayName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim();
  return name && name.length <= 100 && !/\p{Cc}/u.test(name) ? name : null;
}

/** Return permission flags only. NAVER's verification response can echo the
 * access token, so its raw response must never be returned or logged. */
export async function naverProfilePermissions(token: string, fetchProfile: typeof fetch = fetch) {
  try {
    const response = await fetchProfile("https://openapi.naver.com/v1/nid/verify?info=true", {
      headers: { Authorization: `Bearer ${token}` }, cache: "no-store", redirect: "error",
      signal: AbortSignal.timeout(3000)
    });
    if (!response.ok) return { status: "request-failed" } as const;
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object" || !("resultcode" in payload) || payload.resultcode !== "00" ||
        !("response" in payload) || !payload.response || typeof payload.response !== "object" ||
        !("allowed_profile" in payload.response) || typeof payload.response.allowed_profile !== "string") {
      return { status: "unavailable" } as const;
    }
    const permissions = payload.response.allowed_profile.split(",").map((item) => item.trim());
    return { status: "checked", name: permissions.includes("name"), nickname: permissions.includes("nickname") } as const;
  } catch {
    return { status: "request-failed" } as const;
  }
}

/** Profile data is used for display only; identity and access use the verified
 * OIDC subject. Never accept a profile belonging to a different subject. */
export function naverProfileDisplayName(payload: unknown, subject: string): string | null {
  const result = readProfile(payload, subject);
  return result.status === "found" ? result.name : null;
}

function readProfile(payload: unknown, subject: string): ProfileResult {
  if (!payload || typeof payload !== "object" || !("resultcode" in payload) ||
      payload.resultcode !== "00" || !("response" in payload)) return { status: "invalid-response" };
  const profile = payload.response;
  if (!profile || typeof profile !== "object" || !("id" in profile)) return { status: "invalid-response" };
  if (profile.id !== subject) return { status: "subject-mismatch" };
  const name = displayName("nickname" in profile ? profile.nickname : null) ||
    displayName("name" in profile ? profile.name : null);
  return name ? { status: "found", name } : { status: "name-not-provided" };
}

export async function fetchNaverDisplayName(
  token: string,
  subject: string,
  fetchProfile: typeof fetch = fetch
): Promise<string | null> {
  const result = await fetchProfileResult(token, subject, fetchProfile);
  return result.status === "found" ? result.name : null;
}

async function fetchProfileResult(
  token: string,
  subject: string,
  fetchProfile: typeof fetch
): Promise<ProfileResult> {
  try {
    const response = await fetchProfile("https://openapi.naver.com/v1/nid/me", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(3000)
    });
    if (!response.ok) return { status: "request-failed" };
    return readProfile(await response.json(), subject);
  } catch {
    // Optional profile access must never turn a successful login into a failure.
    return { status: "request-failed" };
  }
}

export async function syncNaverDisplayName(
  supabase: Pick<SupabaseClient, "auth">,
  user: User,
  providerToken: string | null | undefined,
  fetchProfile: typeof fetch = fetch
) {
  if (user.is_anonymous || user.app_metadata.provider !== "custom:naver") return "skipped";
  const identity = user.identities?.find((item) => item.provider === "custom:naver");
  if (!identity) return "missing-identity";

  const subject = identity.identity_data?.sub;
  const result = !providerToken ? { status: "missing-token" as const }
    : typeof subject !== "string" ? { status: "missing-subject" as const }
      : await fetchProfileResult(providerToken, subject, fetchProfile);
  const profileName = result.status === "found" ? result.name : null;
  const currentName = displayName(user.user_metadata.name);
  const name = profileName || currentName || `NAVER ${user.id.slice(0, 6)}`;
  if (name !== user.user_metadata.name) {
    // The existing auth.users trigger also updates public.users.name. The
    // provider token and the rest of the profile are never persisted here.
    const { error } = await supabase.auth.updateUser({ data: { name } });
    if (error) return "save-failed";
  }
  return result.status === "found" ? "synced" : result.status;
}
