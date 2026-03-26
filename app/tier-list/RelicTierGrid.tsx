"use client";

import Image from "next/image";
import { useState, useRef } from "react";
import { DndContext, PointerSensor, useSensor, useSensors, useDraggable, type DragEndEvent } from "@dnd-kit/core";
import { TIERS, type Tier, useTierEditor } from "./useTierEditor";
import { TierRow } from "./TierRow";
import { TierShareButton } from "./TierShareButton";

const RARITIES = ["全て", "スターター", "コモン", "アンコモン", "レア", "エンシェント", "ショップ"] as const;
const CHARACTERS = ["全て", "全キャラ共通", "アイアンクラッド", "サイレント", "ディフェクト", "ネクロバインダー", "リージェント"] as const;
const CHAR_ID_MAP: Record<string, string> = {
  "全キャラ共通": "all", "アイアンクラッド": "ironclad", "サイレント": "silent",
  "ディフェクト": "defect", "ネクロバインダー": "necro", "リージェント": "regent",
};

export type RelicItem = {
  id: string;
  name: string;
  rarity: string;
  characterId: string;
  imgUrl: string;
  tier: Tier | null;
};

export function RelicTierGrid({ relics }: { relics: RelicItem[] }) {
  const [rarityFilter, setRarityFilter] = useState<(typeof RARITIES)[number]>("全て");
  const [charFilter, setCharFilter] = useState<(typeof CHARACTERS)[number]>("全て");
  const { isEditing, setIsEditing, tierLabels, updateLabel, moveItem, reset, getEffectiveTier } = useTierEditor("tier_overrides_relics");
  const tierGridRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const filtered = relics.filter((r) => {
    if (rarityFilter !== "全て" && r.rarity !== rarityFilter) return false;
    if (charFilter !== "全て" && r.characterId !== CHAR_ID_MAP[charFilter]) return false;
    return true;
  });

  const grouped: Record<Tier | "unrated", RelicItem[]> = { S: [], A: [], B: [], C: [], D: [], unrated: [] };
  for (const relic of filtered) {
    grouped[getEffectiveTier(relic.id, relic.tier)].push(relic);
  }

  const handleDragEnd = (e: DragEndEvent) => {
    if (e.over) moveItem(String(e.active.id), e.over.id as Tier | "unrated");
    setSelectedId(null);
  };

  const handleTapDrop = (tier: Tier | "unrated", id: string) => {
    moveItem(id, tier);
    setSelectedId(null);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div>
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex gap-2 flex-wrap">
            {RARITIES.map((r) => (
              <button key={r} onClick={() => setRarityFilter(r)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${rarityFilter === r ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                {r}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            {CHARACTERS.map((c) => (
              <button key={c} onClick={() => setCharFilter(c)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${charFilter === c ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          <button onClick={() => { setIsEditing((v) => !v); setSelectedId(null); }}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors ${isEditing ? "bg-white text-gray-900" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>
            {isEditing ? "編集完了" : "編集"}
          </button>
          {isEditing && (
            <button onClick={reset} className="px-4 py-1.5 rounded-full text-sm bg-gray-800 text-red-400 hover:bg-gray-700 transition-colors">
              リセット
            </button>
          )}
          <TierShareButton targetRef={tierGridRef} filename="slay2-relic-tier.png" title="スレスパ2 レリックTier表" />
        </div>

        {isEditing && selectedId && (
          <p className="text-xs text-yellow-400 mb-2">移動先のTierをタップしてください</p>
        )}

        <div ref={tierGridRef} className="space-y-2">
          {TIERS.map((tier) => (
            <TierRow key={tier} tier={tier} label={tierLabels[tier]} isEditing={isEditing}
              onLabelChange={(label) => updateLabel(tier, label)}
              selectedId={selectedId} onTapDrop={(id) => handleTapDrop(tier, id)}
              isEmpty={grouped[tier].length === 0}>
              {grouped[tier].map((relic) => (
                <DraggableItem key={relic.id} id={relic.id} name={relic.name} imgUrl={relic.imgUrl}
                  isEditing={isEditing}
                  isSelected={selectedId === relic.id}
                  onSelect={() => setSelectedId(selectedId === relic.id ? null : relic.id)} />
              ))}
            </TierRow>
          ))}
          <TierRow tier="unrated" label="未評価" isEditing={isEditing}
            selectedId={selectedId} onTapDrop={(id) => handleTapDrop("unrated", id)}
            isEmpty={grouped.unrated.length === 0}>
            {grouped.unrated.map((relic) => (
              <DraggableItem key={relic.id} id={relic.id} name={relic.name} imgUrl={relic.imgUrl}
                isEditing={isEditing} muted
                isSelected={selectedId === relic.id}
                onSelect={() => setSelectedId(selectedId === relic.id ? null : relic.id)} />
            ))}
          </TierRow>
        </div>

        <p className="text-xs text-gray-600 mt-6">
          S: 4.2以上 / A: 3.5以上 / B: 2.8以上 / C: 2.0以上 / D: 2.0未満（加重平均スコア）
          {isEditing && <span className="ml-2 text-gray-500">・ドラッグまたはタップして移動</span>}
        </p>
      </div>
    </DndContext>
  );
}

function DraggableItem({ id, name, imgUrl, isEditing, muted, isSelected, onSelect }: {
  id: string; name: string; imgUrl: string; isEditing: boolean;
  muted?: boolean; isSelected?: boolean; onSelect?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id, disabled: !isEditing });
  const style = transform ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)`, zIndex: 50 } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      onClick={(e) => { if (isEditing) { e.stopPropagation(); onSelect?.(); } }}
      className={`flex flex-col items-center w-14 transition-all touch-none
        ${isEditing ? "cursor-grab active:cursor-grabbing" : ""}
        ${muted && !isSelected ? "opacity-50" : ""}
        ${isSelected ? "ring-2 ring-yellow-400 rounded scale-110" : ""}
        ${isDragging ? "opacity-50" : ""}
      `}>
      <Image src={imgUrl} alt={name} width={56} height={56} className="object-contain rounded pointer-events-none" />
    </div>
  );
}
