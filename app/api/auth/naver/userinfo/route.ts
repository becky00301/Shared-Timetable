import { getNaverUserinfo } from "@/lib/auth/naver-userinfo";

// Called by Supabase Auth with the NAVER access token, never by the browser.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return getNaverUserinfo(request);
}
