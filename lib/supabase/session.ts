import type { User } from "@supabase/supabase-js";

/**
 * How long a page or middleware will wait on the auth server before giving up
 * and treating the visitor as signed out.
 *
 * Auth is a network call. Awaiting it without a bound means one slow region
 * between the edge and Supabase takes the whole site down with a 504, public
 * pages included — which is exactly what happened from icn1. Signed out is a
 * safe answer to fall back on: a protected page sends them to log in, and a
 * public page only loses the right label in the nav.
 */
export const AUTH_LOOKUP_TIMEOUT_MS = 2500;

type AuthClient = { auth: { getUser: () => Promise<{ data: { user: User | null } }> } };

export async function getUserWithin(
  supabase: AuthClient,
  timeoutMs = AUTH_LOOKUP_TIMEOUT_MS
): Promise<User | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), timeoutMs);
    });
    const result = await Promise.race([supabase.auth.getUser(), timeout]);
    return result?.data?.user ?? null;
  } catch {
    // A refused or malformed auth response is the same answer as a slow one.
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
