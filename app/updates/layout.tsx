import type { Metadata } from "next";

const description =
  "플래너 투게더에 새로 생긴 기능과 달라진 점을 날짜순으로 정리했어요. 일정 사진, 동선 지도, 할 일 메모 등.";

export const metadata: Metadata = {
  title: "업데이트 소식",
  description,
  alternates: { canonical: "/updates" },
  openGraph: {
    type: "website",
    url: "/updates",
    title: "업데이트 소식 | Planner Together",
    description
  }
};

export default function UpdatesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
