import type { Metadata } from "next";
import { LandingContent } from "@/components/layout/LandingContent";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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
  const {
    data: { user }
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  return <LandingContent loggedIn={Boolean(user)} />;
}
