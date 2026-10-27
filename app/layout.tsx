import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "틈 · Plan Do See",
  description: "계획과 실제 사이, 나를 알아가는 기록.",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
