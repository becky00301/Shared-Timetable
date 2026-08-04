import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata(
  "새 비밀번호 설정",
  "Planner Together 계정에 사용할 새 비밀번호를 설정합니다."
);

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
