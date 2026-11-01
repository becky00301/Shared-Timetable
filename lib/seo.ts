import type { Metadata } from "next";

export const SITE_URL = "https://www.planner-together.com";
export const SITE_NAME = "Planner Together";
export const SITE_NAME_KO = "플래너 투게더";
export const SITE_DISPLAY_NAME = `${SITE_NAME_KO} (${SITE_NAME})`;
// Leads with the phrase people actually search for a trip plan with; the
// brand still closes the title.
export const HOME_TITLE = `여행 계획표, 엑셀 대신 함께 만드는 공유 시간표 | ${SITE_DISPLAY_NAME}`;
export const HOME_DESCRIPTION =
  "엑셀 여행 계획표 양식 대신, 여행 날짜만 고르면 시간대별 여행 일정표가 생깁니다. 플래너 투게더(Planner Together)는 여행·MT·스터디 일정을 드래그로 만들고 링크 하나로 함께 편집하는 무료 공유 시간표예요. 필요하면 엑셀로도 내보낼 수 있어요.";

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
