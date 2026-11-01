import type { Metadata } from "next";
import { LandingContent } from "@/components/layout/LandingContent";
import { landingFaqStructuredData } from "@/lib/landing-faq";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserWithin } from "@/lib/supabase/session";
import {
  HOME_DESCRIPTION_EN,
  HOME_TITLE_EN,
  LANDING_LANGUAGES,
  SITE_NAME,
  SITE_SHARE_IMAGE_EN,
  WEBSITE_STRUCTURED_DATA_EN
} from "@/lib/seo";

export const dynamic = "force-dynamic";

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

export default async function EnglishHomePage() {
  const supabase = await createSupabaseServerClient();
  // Bounded, as on the Korean landing: it only picks the nav's button label.
  const user = supabase ? await getUserWithin(supabase) : null;

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
      <LandingContent loggedIn={Boolean(user)} />
    </>
  );
}
