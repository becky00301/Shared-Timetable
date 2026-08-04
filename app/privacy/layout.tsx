import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description:
    "Planner Together의 개인정보 수집 항목, 이용 목적, 보유 기간, 파기 절차와 이용자 권리를 안내합니다.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    type: "website",
    url: "/privacy",
    title: "개인정보처리방침 | Planner Together",
    description:
      "Planner Together의 개인정보 수집 항목, 이용 목적, 보유 기간, 파기 절차와 이용자 권리를 안내합니다."
  }
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
