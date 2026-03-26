import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "全敵キャラ 強さランキング | STS2 カード・レリック投票",
  description:
    "Slay the Spire 2（STS2）の全敵キャラ強さランキング。通常・エリート・ボスの強さをみんなで評価。繁茂の地・地下水路・魔窟・栄光の路のエリアごとに確認できます。",
  openGraph: {
    title: "STS2 全敵キャラ 強さランキング",
    description:
      "Slay the Spire 2の全敵キャラ強さをみんなで評価。ボス・エリート・通常敵のランキングを確認しよう。",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
