import type { SupabaseClient, User } from "@supabase/supabase-js";

function displayName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim();
  return name && name.length <= 100 && !/\p{Cc}/u.test(name) ? name : null;
}

/** Profile data is used for display only; identity and access use the verified
 * OIDC subject. Never accept a profile belonging to a different subject. */
export function naverProfileDisplayName(payload: unknown, subject: string): string | null {
  if (!payload || typeof payload !== "object" || !("resultcode" in payload) ||
      payload.resultcode !== "00" || !("response" in payload)) return null;
  const profile = payload.response;
  if (!profile || typeof profile !== "object" || !("id" in profile) ||
      profile.id !== subject) return null;
  return displayName("nickname" in profile ? profile.nickname : null) ||
    displayName("name" in profile ? profile.name : null);
}

export async function fetchNaverDisplayName(
  token: string,
  subject: string,
  fetchProfile: typeof fetch = fetch
): Promise<string | null> {
  try {
    const response = await fetchProfile("https://openapi.naver.com/v1/nid/me", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(3000)
    });
    if (!response.ok) return null;
    return naverProfileDisplayName(await response.json(), subject);
  } catch {
    // Optional profile access must never turn a successful login into a failure.
    return null;
  }
}

export async function syncNaverDisplayName(
  supabase: Pick<SupabaseClient, "auth">,
  user: User,
  providerToken: string | null | undefined,
  fetchProfile: typeof fetch = fetch
) {
  if (user.is_anonymous || user.app_metadata.provider !== "custom:naver") return;
  const identity = user.identities?.find((item) => item.provider === "custom:naver");
  if (!identity) return;

  const subject = identity.identity_data?.sub;
  const profileName = providerToken && typeof subject === "string"
    ? await fetchNaverDisplayName(providerToken, subject, fetchProfile)
    : null;
  const currentName = displayName(user.user_metadata.name);
  const name = profileName || currentName || `NAVER ${user.id.slice(0, 6)}`;
  if (name !== user.user_metadata.name) {
    // The existing auth.users trigger also updates public.users.name. The
    // provider token and the rest of the profile are never persisted here.
    await supabase.auth.updateUser({ data: { name } });
  }
}
