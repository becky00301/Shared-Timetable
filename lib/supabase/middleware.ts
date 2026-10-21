import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicConfig } from "@/lib/supabase/env";
import { getUserWithin } from "@/lib/supabase/session";

const PROTECTED_PREFIXES = ["/account", "/plans"];
const EMBED_TOKEN_PATTERN = /^[A-Fa-f0-9]{32}$/;
const FRAME_ANCESTORS =
  "frame-ancestors https://notion.so https://*.notion.so https://notion.site https://*.notion.site https://notion.com https://*.notion.com https://iframe.ly https://*.iframe.ly";

function projectEmbedToken(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/plans/")) return null;
  const token = request.nextUrl.searchParams.get("embed");
  return token && EMBED_TOKEN_PATTERN.test(token) ? token : null;
}

function withProjectFrameHeaders(response: NextResponse, embedAllowed: boolean) {
  if (embedAllowed) {
    response.headers.delete("X-Frame-Options");
    response.headers.set("Content-Security-Policy", FRAME_ANCESTORS);
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  } else {
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  }
  return response;
}

function isIframe(request: NextRequest) {
  return request.headers.get("sec-fetch-dest") === "iframe";
}

// Outside an iframe the reader is a person who followed a link, so the embed
// renders as a page with something they can act on rather than as a block.
function rewriteToEmbed(request: NextRequest, token: string) {
  const embedUrl = request.nextUrl.clone();
  embedUrl.pathname = `/embed/${token}`;
  embedUrl.search = isIframe(request) ? "" : "?view=page";
  return withProjectFrameHeaders(NextResponse.rewrite(embedUrl), true);
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const isProjectPage =
    request.nextUrl.pathname === "/plans" || request.nextUrl.pathname.startsWith("/plans/");
  const embedToken = projectEmbedToken(request);

  if (embedToken && isIframe(request)) {
    return rewriteToEmbed(request, embedToken);
  }

  const isProtected = PROTECTED_PREFIXES.some((prefix) => request.nextUrl.pathname.startsWith(prefix));
  // Everything else is public, and asking the auth server about a visitor who
  // is only reading the landing page buys nothing while costing a round trip
  // that can take the whole site down when it is slow.
  if (!isProtected && !embedToken) return supabaseResponse;

  const { url, key, configured } = getSupabasePublicConfig();
  if (!configured) {
    if (embedToken) return rewriteToEmbed(request, embedToken);
    return isProjectPage ? withProjectFrameHeaders(supabaseResponse, false) : supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
      }
    }
  });

  const user = await getUserWithin(supabase);

  if (!user && embedToken) {
    return rewriteToEmbed(request, embedToken);
  }

  if (!user && isProtected) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    redirectUrl.searchParams.set("next", request.nextUrl.pathname);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    return isProjectPage ? withProjectFrameHeaders(redirectResponse, false) : redirectResponse;
  }

  return isProjectPage
    ? withProjectFrameHeaders(supabaseResponse, Boolean(embedToken))
    : supabaseResponse;
}
