/** Reopen NAVER's optional profile consent screen only after the user asks
 * to import their display name. Ordinary sign-in keeps its existing flow. */
export function naverProfileConsentRequest(origin: string) {
  const callback = new URL("/auth/callback", origin);
  callback.searchParams.set("next", "/account");
  return {
    provider: "custom:naver" as const,
    options: {
      redirectTo: callback.href,
      queryParams: { prompt: "consent" }
    }
  };
}
