import type { Metadata } from "next";

export const SITE_URL = "https://www.planner-together.com";
export const SITE_NAME = "Planner Together";
export const SITE_NAME_KO = "플래너 투게더";
export const SITE_DISPLAY_NAME = `${SITE_NAME_KO} (${SITE_NAME})`;
export const HOME_TITLE = `${SITE_DISPLAY_NAME} | 함께 만드는 공유 시간표`;
export const HOME_DESCRIPTION =
  "혼자 일정표 만들다가 지치셨나요? 이제는 친구들과 함께 쉽게 만들고 편집하고 공유해요.";

// The English landing at /en, written for the searches English speakers make
// for this: "trip planner", "travel planner", "itinerary".
export const HOME_TITLE_EN = "Free Trip Planner & Shared Travel Itinerary | Planner Together";
export const HOME_DESCRIPTION_EN =
  "Planner Together is a free trip planner you build with friends. Pick your travel dates, drag plans onto an hour-by-hour itinerary, and share it with one link — no spreadsheet needed. Export to Excel or PDF anytime.";

/** hreflang pairs for the landing: each language version points at both. */
export const LANDING_LANGUAGES = { ko: "/", en: "/en", "x-default": "/" };

export const SITE_SHARE_IMAGE = {
  url: `${SITE_URL}/og/planner-together-v1.png`,
  width: 1200,
  height: 630,
  type: "image/png",
  alt: "플래너 투게더 · 함께 만드는 공유 시간표. 드래그로 만들고, 링크 하나로 공유하세요."
};

export const SITE_SHARE_IMAGE_EN = {
  ...SITE_SHARE_IMAGE,
  alt: "Planner Together, a shared timetable built together. Drag to plan, share with one link."
};

export const WEBSITE_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME_KO,
  alternateName: [SITE_NAME, "플래너투게더"],
  url: `${SITE_URL}/`,
  description: HOME_DESCRIPTION,
  inLanguage: ["ko-KR", "en-US"]
};

export const WEBSITE_STRUCTURED_DATA_EN = {
  ...WEBSITE_STRUCTURED_DATA,
  name: SITE_NAME,
  alternateName: [SITE_NAME_KO, "플래너투게더"],
  url: `${SITE_URL}/en`,
  description: HOME_DESCRIPTION_EN,
  inLanguage: "en-US"
};

export function createNoIndexMetadata(title: string, description: string): Metadata {
  return {
    title,
    description,
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true
      }
    }
  };
}
