import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "PlanTogether",
  description: "Collaborative schedule documents for selected dates."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" data-scroll-behavior="smooth">
      <body>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
