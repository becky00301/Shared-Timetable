import type { Metadata } from "next";
import { GoogleTagManager } from "@next/third-parties/google";
import { ThemeProvider } from "@appica/ui-react/providers/theme-provider";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";
import { AccentEffect } from "@/components/layout/AccentEffect";
import { FeedbackButton } from "@/components/layout/FeedbackButton";
import { LocaleProvider } from "@/lib/i18n/locale";
import { HOME_DESCRIPTION, HOME_TITLE, SITE_DISPLAY_NAME, SITE_NAME_KO, SITE_SHARE_IMAGE, SITE_URL } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: HOME_TITLE,
    template: `%s | ${SITE_DISPLAY_NAME}`
  },
  description: HOME_DESCRIPTION,
  applicationName: SITE_DISPLAY_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME_KO,
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [SITE_SHARE_IMAGE]
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [SITE_SHARE_IMAGE.url]
  },
  keywords: [
    "플래너 투게더",
    "플래너투게더",
    "Planner Together",
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
      <head>
        {/* Applies the saved accent before the first paint. Without it every
            page would flash the default blue and then repaint. Deliberately
            inline and dependency-free: it has to run ahead of React. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var v=localStorage.getItem("plantogether.accent");if(!/^#[0-9a-f]{6}$/i.test(v||""))return;var r=document.documentElement,n=v.slice(1),c=[0,2,4].map(function(o){return parseInt(n.slice(o,o+2),16)});r.style.setProperty("--accent",v);r.style.setProperty("--accent-hover","#"+c.map(function(x){return Math.max(0,Math.round(x*0.88)).toString(16).padStart(2,"0")}).join(""));var l=c.map(function(x){x/=255;return x<=0.04045?x/12.92:Math.pow((x+0.055)/1.055,2.4)});r.style.setProperty("--accent-foreground",0.2126*l[0]+0.7152*l[1]+0.0722*l[2]>0.179?"#111827":"#FFFFFF")}catch(e){}})()`
          }}
        />
      </head>
      <body>
        {/* Pretendard, dynamic-subset: the browser pulls only the unicode
            ranges a page actually renders, so Korean copy gets a real typeface
            for a few tens of KB instead of the OS fallback. React hoists these
            into <head>. */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
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
        <AccentEffect />
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
