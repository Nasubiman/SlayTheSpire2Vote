"use client";

import Image from "next/image";
import { useState } from "react";

const TIERS = ["S", "A", "B", "C", "D"] as const;
type Tier = (typeof TIERS)[number];

const TIER_STYLES: Record<Tier, { bg: string; text: string; rowBg: string }> = {
  S: { bg: "bg-yellow-400", text: "text-black", rowBg: "bg-yellow-400/10 border-yellow-400/30" },
  A: { bg: "bg-red-500",    text: "text-white",  rowBg: "bg-red-500/10 border-red-500/30" },
  B: { bg: "bg-green-500",  text: "text-white",  rowBg: "bg-green-500/10 border-green-500/30" },
  C: { bg: "bg-blue-500",   text: "text-white",  rowBg: "bg-blue-500/10 border-blue-500/30" },
  D: { bg: "bg-gray-500",   text: "text-white",  rowBg: "bg-gray-500/10 border-gray-500/30" },
};

const CARD_TYPES = ["全て", "アタック", "スキル", "パワー"] as const;
const RARITIES = ["全て", "コモン", "アンコモン", "レア", "スターター"] as const;

export type CardItem = {
  id: string;
  name: string;
  type: string;
  rarity: string;
  imgUrl: string;
  tier: Tier | null;
};

export function CardTierGrid({ cards }: { cards: CardItem[] }) {
  const [typeFilter, setTypeFilter] = useState<(typeof CARD_TYPES)[number]>("全て");
  const [rarityFilter, setRarityFilter] = useState<(typeof RARITIES)[number]>("全て");

  const filtered = cards.filter((c) => {
    if (typeFilter !== "全て" && c.type !== typeFilter) return false;
    if (rarityFilter !== "全て" && c.rarity !== rarityFilter) return false;
    return true;
  });

  const tiered: Record<Tier, CardItem[]> = { S: [], A: [], B: [], C: [], D: [] };
  const unvoted: CardItem[] = [];
  for (const card of filtered) {
    if (card.tier === null) unvoted.push(card);
    else tiered[card.tier].push(card);
  }

  return (
    <div>
      {/* フィルター */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex gap-2 flex-wrap">
          {CARD_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                typeFilter === t ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {RARITIES.map((r) => (
            <button
              key={r}
              onClick={() => setRarityFilter(r)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                rarityFilter === r ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Tier表 */}
      <div className="space-y-2">
        {TIERS.map((tier) => {
          const items = tiered[tier];
          if (items.length === 0) return null;
          const style = TIER_STYLES[tier];
          return (
            <div key={tier} className={`flex rounded-lg overflow-hidden border ${style.rowBg}`}>
              <div className={`${style.bg} ${style.text} w-12 flex-shrink-0 flex items-center justify-center font-bold text-xl`}>
                {tier}
              </div>
              <div className="flex flex-wrap gap-2 p-2">
                {items.map((card) => (
                  <div key={card.id} className="flex flex-col items-center w-14">
                    <Image src={card.imgUrl} alt={card.name} width={56} height={78} className="object-contain rounded" />
                    <p className="text-xs text-center mt-0.5 line-clamp-2 leading-tight w-full text-gray-300">{card.name}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {unvoted.length > 0 && (
          <div className="flex rounded-lg overflow-hidden border border-gray-700/30 mt-4">
            <div className="bg-gray-700 text-gray-300 w-12 flex-shrink-0 flex items-center justify-center font-bold text-xs text-center leading-tight px-1">
              未評価
            </div>
            <div className="flex flex-wrap gap-2 p-2">
              {unvoted.map((card) => (
                <div key={card.id} className="flex flex-col items-center w-14 opacity-50">
                  <Image src={card.imgUrl} alt={card.name} width={56} height={78} className="object-contain rounded" />
                  <p className="text-xs text-center mt-0.5 line-clamp-2 leading-tight w-full text-gray-400">{card.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-600 mt-6">
        S: 4.2以上 / A: 3.5以上 / B: 2.8以上 / C: 2.0以上 / D: 2.0未満（加重平均スコア）
      </p>
    </div>
  );
}
