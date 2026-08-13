import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  typedRoutes: false,
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
            // Any host may frame an embed: the unguessable token is the access
            // control, and a domain allowlist silently blanks out surfaces we
            // can't enumerate (Notion desktop, iframely proxies, other wikis).
            key: "Content-Security-Policy",
            value: "frame-ancestors *"
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
