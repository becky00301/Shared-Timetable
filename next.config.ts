import type { NextConfig } from "next";
import { HTML_LIMITED_BOT_UA_RE } from "next/dist/shared/lib/router/utils/is-bot";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  typedRoutes: false,
  // Kakao's preview crawler needs OG tags in <head>, before streamed content.
  // Extend Next's list so existing Google, Facebook, X, and other bots retain
  // their default metadata handling.
  htmlLimitedBots: new RegExp(`${HTML_LIMITED_BOT_UA_RE.source}|kakaotalk|kakaostory`, "i"),
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff"
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()"
          }
        ]
      },
      {
        source: "/((?!embed(?:/|$)|plans(?:/|$)).*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY"
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin"
          }
        ]
      },
      {
        source: "/embed/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors https://notion.so https://*.notion.so https://notion.site https://*.notion.site https://notion.com https://*.notion.com https://iframe.ly https://*.iframe.ly"
          },
          {
            key: "Referrer-Policy",
            value: "no-referrer"
          },
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
