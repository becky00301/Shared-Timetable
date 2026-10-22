import type { Metadata } from "next";

const description =
  "Planner Together의 회원가입, 시간표 공동 편집과 공유, 이용자 콘텐츠, 회원 탈퇴 및 서비스 이용 조건을 안내합니다.";

export const metadata: Metadata = {
  title: "서비스 이용약관",
  description,
  alternates: { canonical: "/terms" },
  openGraph: {
    type: "website",
    url: "/terms",
    title: "서비스 이용약관 | Planner Together",
    description
  }
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
