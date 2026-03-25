import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Slay the Spire 2 (STS2) カード・レリック 評価ランキング | 最強カード Tier表",
  description:
    "Slay the Spire 2（スレイザスパイア2）のカード・レリック評価ランキングサイトです。アイアンクラッド、サイレント、ディフェクトや新キャラのネクロバインダーのカードを評価して、みんなで作る最強カードTier表（ランキング）を確認しよう！",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
