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

const AREAS = ["全て", "繁茂の地", "地下水路", "魔窟", "栄光の路"] as const;
const TYPES = ["全て", "通常", "エリート", "ボス"] as const;

export type EnemyItem = {
  id: string;
  name: string;
  area: string;
  type: string;
  imgUrl: string;
  tier: Tier | null;
};

export function EnemyTierGrid({ enemies }: { enemies: EnemyItem[] }) {
  const [areaFilter, setAreaFilter] = useState<(typeof AREAS)[number]>("全て");
  const [typeFilter, setTypeFilter] = useState<(typeof TYPES)[number]>("全て");

  const filtered = enemies.filter((e) => {
    if (areaFilter !== "全て" && e.area !== areaFilter) return false;
    if (typeFilter !== "全て" && e.type !== typeFilter) return false;
    return true;
  });

  const tiered: Record<Tier, EnemyItem[]> = { S: [], A: [], B: [], C: [], D: [] };
  const unvoted: EnemyItem[] = [];
  for (const enemy of filtered) {
    if (enemy.tier === null) unvoted.push(enemy);
    else tiered[enemy.tier].push(enemy);
  }

  return (
    <div>
      {/* フィルター */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex gap-2 flex-wrap">
          {AREAS.map((a) => (
            <button
              key={a}
              onClick={() => setAreaFilter(a)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                areaFilter === a ? "bg-green-700 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                typeFilter === t ? "bg-red-700 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {t}
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
                {items.map((enemy) => (
                  <div key={enemy.id} className="flex flex-col items-center w-14">
                    <Image src={enemy.imgUrl} alt={enemy.name} width={56} height={56} className="object-contain rounded bg-gray-800" />
                    <p className="text-xs text-center mt-0.5 line-clamp-2 leading-tight w-full text-gray-300">{enemy.name}</p>
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
              {unvoted.map((enemy) => (
                <div key={enemy.id} className="flex flex-col items-center w-14 opacity-50">
                  <Image src={enemy.imgUrl} alt={enemy.name} width={56} height={56} className="object-contain rounded bg-gray-800" />
                  <p className="text-xs text-center mt-0.5 line-clamp-2 leading-tight w-full text-gray-400">{enemy.name}</p>
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
