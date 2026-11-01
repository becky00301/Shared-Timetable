import type { Metadata } from "next";
import { LandingContent } from "@/components/layout/LandingContent";
import { landingFaqStructuredData } from "@/lib/landing-faq";
import {
  HOME_DESCRIPTION,
  HOME_TITLE,
  LANDING_LANGUAGES,
  SITE_NAME_KO,
  SITE_SHARE_IMAGE,
  WEBSITE_STRUCTURED_DATA
} from "@/lib/seo";

export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  alternates: { canonical: "/", languages: LANDING_LANGUAGES },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME_KO,
    locale: "ko_KR",
    alternateLocale: ["en_US"],
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [SITE_SHARE_IMAGE]
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [SITE_SHARE_IMAGE.url]
  }
};

const FAQ_STRUCTURED_DATA = landingFaqStructuredData("ko");

// Built once and served to everyone: the only account-dependent part, the
// nav and call-to-action buttons, reads the session in the browser.
export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(WEBSITE_STRUCTURED_DATA).replace(/</g, "\\u003c")
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(FAQ_STRUCTURED_DATA).replace(/</g, "\\u003c")
        }}
      />
      <LandingContent />
    </>
  );
}
