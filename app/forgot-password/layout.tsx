import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata(
  "비밀번호 재설정",
  "Planner Together 계정의 비밀번호 재설정 링크를 요청합니다."
);

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
