import type { Metadata } from "next";
import { LandingContent } from "@/components/layout/LandingContent";
import { landingFaqStructuredData } from "@/lib/landing-faq";
import {
  HOME_DESCRIPTION_EN,
  HOME_TITLE_EN,
  LANDING_LANGUAGES,
  SITE_NAME,
  SITE_SHARE_IMAGE_EN,
  WEBSITE_STRUCTURED_DATA_EN
} from "@/lib/seo";

// The English landing. Same page as /, but the locale provider pins English
// for this address, so the server sends English markup for search engines to
// index under English queries.
export const metadata: Metadata = {
  title: { absolute: HOME_TITLE_EN },
  description: HOME_DESCRIPTION_EN,
  keywords: [
    "trip planner",
    "travel planner",
    "itinerary planner",
    "travel itinerary",
    "group trip planner",
    "shared itinerary",
    "travel itinerary template",
    "trip planner excel alternative",
    "shared timetable",
    "Planner Together"
  ],
  alternates: { canonical: "/en", languages: LANDING_LANGUAGES },
  openGraph: {
    type: "website",
    url: "/en",
    siteName: SITE_NAME,
    locale: "en_US",
    alternateLocale: ["ko_KR"],
    title: HOME_TITLE_EN,
    description: HOME_DESCRIPTION_EN,
    images: [SITE_SHARE_IMAGE_EN]
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE_EN,
    description: HOME_DESCRIPTION_EN,
    images: [SITE_SHARE_IMAGE_EN.url]
  }
};

const FAQ_STRUCTURED_DATA = landingFaqStructuredData("en");

// Built once and served to everyone: the only account-dependent part, the
// nav and call-to-action buttons, reads the session in the browser.
export default function EnglishHomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(WEBSITE_STRUCTURED_DATA_EN).replace(/</g, "\\u003c")
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
