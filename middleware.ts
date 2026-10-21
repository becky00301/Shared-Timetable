import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Only the paths that actually need a session: the gated pages, and the
  // project pages where an embed token decides what gets rendered. Running on
  // everything meant one slow auth call could 504 the landing page, which has
  // nothing to do with who is asking.
  //
  // Token refresh is not lost by narrowing this: the browser client refreshes
  // on its own, and the server components that need a session fetch it.
  matcher: ["/account/:path*", "/plans/:path*"]
};
