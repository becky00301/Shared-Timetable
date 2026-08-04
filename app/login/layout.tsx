import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata(
  "로그인 및 회원가입",
  "Planner Together에 로그인하거나 계정을 만들고 공유 시간표를 관리하세요."
);

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
