import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

// Manage the app's own calendars and their events.
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/userinfo.email"
].join(" ");

export function getGoogleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
  return { clientId, clientSecret, configured: Boolean(clientId && clientSecret) };
}

export function buildAuthUrl(redirectUri: string, state: string) {
  const { clientId } = getGoogleConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES,
    // offline + consent so we reliably receive a refresh_token.
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state
  });
  return `${AUTH_URL}?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  error?: string;
  error_description?: string;
};

export async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const { clientId, clientSecret } = getGoogleConfig();
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    })
  });
  const data = (await response.json()) as TokenResponse;
  if (!response.ok) throw new Error(data.error_description || data.error || "토큰 교환에 실패했어요.");
  return data;
}

export async function fetchGoogleEmail(accessToken: string) {
  const response = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) return null;
  const data = (await response.json()) as { email?: string };
  return data.email ?? null;
}

export async function saveTokens(
  userId: string,
  tokens: { access_token: string; refresh_token?: string; expires_in: number },
  googleEmail: string | null
) {
  const admin = createSupabaseAdminClient();
  if (!admin) throw new Error("서버 설정이 완료되지 않았어요 (service role key).");

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  const payload = {
    user_id: userId,
    access_token: tokens.access_token,
    token_expires_at: expiresAt,
    google_email: googleEmail,
    // Google only returns refresh_token on first consent; keep the stored one otherwise.
    ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {})
  };

  const { error } = await admin.from("google_accounts").upsert(payload, { onConflict: "user_id" });
  if (error) throw error;
}

// Returns a usable access token for the user, refreshing it when expired.
export async function getAccessToken(userId: string): Promise<string | null> {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from("google_accounts")
    .select("access_token, refresh_token, token_expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;

  const expiresAt = data.token_expires_at ? new Date(data.token_expires_at).getTime() : 0;
  // Refresh a minute early to avoid racing expiry mid-request.
  if (expiresAt - 60_000 > Date.now()) return data.access_token;
  if (!data.refresh_token) return null;

  const { clientId, clientSecret } = getGoogleConfig();
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: data.refresh_token,
      grant_type: "refresh_token"
    })
  });
  const refreshed = (await response.json()) as TokenResponse;
  if (!response.ok) return null;

  await admin
    .from("google_accounts")
    .update({
      access_token: refreshed.access_token,
      token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
    })
    .eq("user_id", userId);

  return refreshed.access_token;
}
