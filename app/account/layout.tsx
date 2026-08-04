import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata(
  "마이페이지",
  "Planner Together 계정의 비밀번호와 회원 정보를 관리합니다."
);

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
