import type { Metadata } from "next";
import { LandingContent } from "@/components/layout/LandingContent";
import { LANDING_FAQ } from "@/lib/landing-faq";
import { messages } from "@/lib/i18n/messages";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserWithin } from "@/lib/supabase/session";
import { HOME_DESCRIPTION, HOME_TITLE, SITE_NAME_KO, SITE_SHARE_IMAGE, WEBSITE_STRUCTURED_DATA } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  alternates: { canonical: "/" },
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

// The same questions the landing shows, in the Korean the page is served in,
// so the answers can appear directly under the search result.
const FAQ_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: LANDING_FAQ.map(([question, answer]) => ({
    "@type": "Question",
    name: messages[question].ko,
    acceptedAnswer: { "@type": "Answer", text: messages[answer].ko }
  }))
};

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  // Bounded: this only decides whether the nav says "my timetables" or
  // "get started", which is not worth making the page wait on auth.
  const user = supabase ? await getUserWithin(supabase) : null;

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
      <LandingContent loggedIn={Boolean(user)} />
    </>
  );
}
