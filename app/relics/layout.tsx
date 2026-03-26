import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "全レリック 強さ評価ランキング | STS2 カード・レリック投票",
  description:
    "Slay the Spire 2（STS2）の全レリック強さ評価ランキング。スターター・コモン・アンコモン・レア・エンシェント・ショップレリックをみんなで評価。最強レリックを確認しよう。",
  openGraph: {
    title: "STS2 全レリック 強さ評価ランキング",
    description:
      "Slay the Spire 2の全レリック強さをみんなで評価。最強レリックランキングを確認しよう。",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
