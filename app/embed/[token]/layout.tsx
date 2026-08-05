import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "공유 시간표",
  robots: { index: false, follow: false, noarchive: true }
};

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
