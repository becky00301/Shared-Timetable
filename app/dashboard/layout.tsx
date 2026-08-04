import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata(
  "내 공유 시간표",
  "내가 만들거나 참여 중인 Planner Together 공유 시간표를 관리합니다."
);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
