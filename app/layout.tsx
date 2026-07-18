import type { Metadata } from "next";
import { GoogleTagManager } from "@next/third-parties/google";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "PlanTogether",
  description: "Collaborative schedule documents for selected dates."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;

  return (
    <html lang="en" data-scroll-behavior="smooth">
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
        {children}
        <Toaster richColors position="top-right" />
      </body>
      {gtmId ? <GoogleTagManager gtmId={gtmId} /> : null}
    </html>
  );
}
