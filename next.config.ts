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
