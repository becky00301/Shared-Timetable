import type { Metadata } from "next";
import { LandingContent } from "@/components/layout/LandingContent";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserWithin } from "@/lib/supabase/session";
import { HOME_DESCRIPTION, HOME_TITLE, SITE_NAME } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    locale: "ko_KR",
    alternateLocale: ["en_US"],
    title: HOME_TITLE,
    description: HOME_DESCRIPTION
  },
  twitter: {
    card: "summary",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION
  }
};

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  // Bounded: this only decides whether the nav says "my timetables" or
  // "get started", which is not worth making the page wait on auth.
  const user = supabase ? await getUserWithin(supabase) : null;

  return <LandingContent loggedIn={Boolean(user)} />;
}
