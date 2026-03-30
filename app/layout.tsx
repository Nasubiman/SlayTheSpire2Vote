import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_TITLE = "スレスパ2 / Slay the Spire 2 (STS2) カード・レリック 評価ランキング | 最強カード Tier表";
const SITE_DESCRIPTION =
  "スレスパ2（Slay the Spire 2 / STS2）のカード・レリック評価ランキングサイトです。アイアンクラッド、サイレント、ディフェクトや新キャラのネクロバインダーのカードを評価して、みんなで作る最強カードTier表（ランキング）を確認しよう！";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000"
  ),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    type: "website",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
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
      <head>
        <link rel="preconnect" href="https://firestore.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://aoessbyed5xnzfiq.public.blob.vercel-storage.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <ScrollToTopButton />
      </body>
    </html>
  );
}
