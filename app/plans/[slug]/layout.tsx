import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata(
  "공유 시간표",
  "Planner Together에서 참여자들과 날짜별 일정을 함께 작성하고 확인합니다."
);

export default function PlanLayout({ children }: { children: React.ReactNode }) {
  return children;
}
