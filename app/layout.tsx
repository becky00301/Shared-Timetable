import type { Metadata } from "next";
import { GoogleTagManager } from "@next/third-parties/google";
import { ThemeProvider } from "@appica/ui-react/providers/theme-provider";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";
import { FeedbackButton } from "@/components/layout/FeedbackButton";
import { LocaleProvider } from "@/lib/i18n/locale";
import { HOME_DESCRIPTION, HOME_TITLE, SITE_NAME, SITE_URL } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: HOME_TITLE,
    template: `%s | ${SITE_NAME}`
  },
  description: HOME_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "공유 시간표",
    "일정 공유",
    "온라인 시간표",
    "여행 일정",
    "MT 일정",
    "스터디 일정",
    "프로젝트 일정",
    "팀 일정 관리"
  ],
  category: "productivity",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1
    }
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;

  return (
    <html lang="ko" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        {gtmId ? (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        ) : null}
        <ThemeProvider defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <LocaleProvider>
            {children}
            <FeedbackButton />
          </LocaleProvider>
        </ThemeProvider>
        <Toaster richColors position="top-right" />
        <Analytics />
      </body>
      {gtmId ? <GoogleTagManager gtmId={gtmId} /> : null}
    </html>
  );
}
