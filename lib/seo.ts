import type { Metadata } from "next";

export const SITE_URL = "https://www.planner-together.com";
export const SITE_NAME = "Planner Together";
export const HOME_TITLE = "Planner Together | 함께 만드는 공유 시간표";
export const HOME_DESCRIPTION =
  "여행, MT, 스터디, 프로젝트 일정을 함께 만드는 무료 공유 시간표. 원하는 날짜를 고르고 일정을 드래그해 만든 뒤 링크 하나로 간편하게 공유하세요.";

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
