import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata(
  "공유 시간표 초대",
  "Planner Together 공유 시간표 초대를 확인하고 참여합니다."
);

export default function InviteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
