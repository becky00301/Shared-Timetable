const NAVER_PROFILE_URL = "https://openapi.naver.com/v1/nid/me";
const HEADERS = { "Cache-Control": "no-store", Pragma: "no-cache" };

function errorResponse(error: string, status: number) {
  return Response.json({ error }, { status, headers: HEADERS });
}

/** Normalize NAVER's nested profile response for Supabase's custom OAuth2
 * provider. Never infer email ownership from a contact email, and never copy
 * arbitrary profile fields or credentials into Supabase user metadata. */
export async function getNaverUserinfo(request: Request, fetcher: typeof fetch = fetch) {
  const authorization = request.headers.get("authorization") ?? "";
  if (!/^Bearer [A-Za-z0-9+/_=.-]{1,2048}$/i.test(authorization)) {
    return errorResponse("invalid_token", 401);
  }

  let upstream: Response;
  let payload: unknown;
  try {
    upstream = await fetcher(NAVER_PROFILE_URL, {
      method: "GET",
      headers: { Authorization: authorization, Accept: "application/json" },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000)
    });
    if (!upstream.ok) {
      return errorResponse("profile_unavailable", upstream.status === 401 || upstream.status === 403 ? 401 : 502);
    }
    payload = await upstream.json();
  } catch {
    // Upstream errors may contain credentials or personal information.
    return errorResponse("profile_unavailable", 502);
  }

  if (!payload || typeof payload !== "object") return errorResponse("invalid_profile", 502);
  const data = payload as { resultcode?: unknown; response?: unknown };
  if (data.resultcode !== "00" || !data.response || typeof data.response !== "object") {
    return errorResponse("invalid_profile", 401);
  }
  const profile = data.response as { id?: unknown; email?: unknown };
  if (typeof profile.id !== "string" || !profile.id.trim()) {
    return errorResponse("invalid_profile", 502);
  }
  if (typeof profile.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
    return errorResponse("email_required", 403);
  }

  return Response.json({
    sub: profile.id,
    email: profile.email,
    email_verified: false
  }, { headers: HEADERS });
}
