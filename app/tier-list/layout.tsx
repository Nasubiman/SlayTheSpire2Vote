import Link from "next/link";
import type { Metadata } from "next";
import { TierListNav } from "./TierListNav";

export const metadata: Metadata = {
  title: "Tier表 | Slay the Spire 2（スレスパ2）カード・レリック評価ランキング",
  description:
    "スレスパ2（Slay the Spire 2）のカード・レリック・敵キャラの投票結果をもとに自動生成されたTier表。S〜Dランクでランキングを確認できます。",
};

export default function TierListLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/" className="text-gray-400 hover:text-white text-sm transition-colors">
            ← トップに戻る
          </Link>
          <div className="mt-3">
            <h1 className="text-2xl font-bold">Tier表</h1>
            <p className="text-gray-400 text-sm mt-1">投票結果をもとに自動生成</p>
          </div>
        </div>
        <TierListNav />
        {children}
      </div>
    </main>
  );
}
