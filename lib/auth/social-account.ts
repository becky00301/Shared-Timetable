type AccountIdentity = {
  id: string;
  email?: string | null;
  is_anonymous?: boolean;
  identities?: { provider: string }[];
};

export function isEmailLessNaverAccount(user: AccountIdentity | null | undefined) {
  return Boolean(user && !user.is_anonymous && !user.email &&
    user.identities?.some((identity) => identity.provider === "custom:naver"));
}

export function naverAccountLabel(id: string) {
  return `NAVER ${id.slice(0, 6)}`;
}

/** Only call with claims returned by Supabase getClaims(), after signature
 * verification. A refreshed token's iat is not evidence of a recent login. */
export function hasRecentOAuthLogin(
  claims: { sub?: unknown; amr?: unknown } | null | undefined,
  userId: string,
  nowSeconds = Date.now() / 1000
) {
  if (claims?.sub !== userId || !Array.isArray(claims.amr)) return false;
  return claims.amr.some((entry: unknown) => {
    if (!entry || typeof entry !== "object") return false;
    const { method, timestamp } = entry as { method?: unknown; timestamp?: unknown };
    return method === "oauth" && typeof timestamp === "number" &&
      Number.isFinite(timestamp) && timestamp <= nowSeconds && nowSeconds - timestamp < 300;
  });
}
