"use client";

import Image from "next/image";
import { useState } from "react";
import { TIERS, type Tier, useTierEditor } from "./useTierEditor";
import { TierRow } from "./TierRow";

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
  const { isEditing, setIsEditing, tierLabels, updateLabel, moveItem, reset, getEffectiveTier } = useTierEditor("tier_overrides_enemies");

  const filtered = enemies.filter((e) => {
    if (areaFilter !== "全て" && e.area !== areaFilter) return false;
    if (typeFilter !== "全て" && e.type !== typeFilter) return false;
    return true;
  });

  const grouped: Record<Tier | "unrated", EnemyItem[]> = { S: [], A: [], B: [], C: [], D: [], unrated: [] };
  for (const enemy of filtered) {
    grouped[getEffectiveTier(enemy.id, enemy.tier)].push(enemy);
  }

  return (
    <div>
      {/* フィルター */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex gap-2 flex-wrap">
          {AREAS.map((a) => (
            <button key={a} onClick={() => setAreaFilter(a)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${areaFilter === a ? "bg-green-700 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
              {a}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {TYPES.map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${typeFilter === t ? "bg-red-700 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* 編集ボタン */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setIsEditing((v) => !v)}
          className={`px-4 py-1.5 rounded-full text-sm transition-colors ${isEditing ? "bg-white text-gray-900" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>
          {isEditing ? "編集完了" : "編集"}
        </button>
        {isEditing && (
          <button onClick={reset} className="px-4 py-1.5 rounded-full text-sm bg-gray-800 text-red-400 hover:bg-gray-700 transition-colors">
            リセット
          </button>
        )}
      </div>

      {/* Tier表 */}
      <div className="space-y-2">
        {TIERS.map((tier) => (
          <TierRow key={tier} tier={tier} label={tierLabels[tier]} isEditing={isEditing}
            onLabelChange={(label) => updateLabel(tier, label)}
            onDrop={(id) => moveItem(id, tier)} isEmpty={grouped[tier].length === 0}>
            {grouped[tier].map((enemy) => (
              <DraggableItem key={enemy.id} id={enemy.id} name={enemy.name} imgUrl={enemy.imgUrl} isEditing={isEditing} />
            ))}
          </TierRow>
        ))}
        <TierRow tier="unrated" label="未評価" isEditing={isEditing}
          onDrop={(id) => moveItem(id, "unrated")} isEmpty={grouped.unrated.length === 0}>
          {grouped.unrated.map((enemy) => (
            <DraggableItem key={enemy.id} id={enemy.id} name={enemy.name} imgUrl={enemy.imgUrl} isEditing={isEditing} muted />
          ))}
        </TierRow>
      </div>

      <p className="text-xs text-gray-600 mt-6">
        S: 4.2以上 / A: 3.5以上 / B: 2.8以上 / C: 2.0以上 / D: 2.0未満（加重平均スコア）
        {isEditing && <span className="ml-2 text-gray-500">・ドラッグして移動、ラベルをクリックして編集</span>}
      </p>
    </div>
  );
}

function DraggableItem({ id, name, imgUrl, isEditing, muted }: {
  id: string; name: string; imgUrl: string; isEditing: boolean; muted?: boolean;
}) {
  return (
    <div draggable={isEditing} onDragStart={(e) => e.dataTransfer.setData("itemId", id)}
      className={`flex flex-col items-center w-14 ${isEditing ? "cursor-grab active:cursor-grabbing" : ""} ${muted ? "opacity-50" : ""}`}>
      <Image src={imgUrl} alt={name} width={56} height={56} className="object-contain rounded bg-gray-800 pointer-events-none" />
      <p className="text-xs text-center mt-0.5 line-clamp-2 leading-tight w-full text-gray-300">{name}</p>
    </div>
  );
}
