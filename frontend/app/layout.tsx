import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "EduFlow AI｜AI 课程研发工作台",
  description: "从课程创意到课程交付，一站式完成课程研发。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
