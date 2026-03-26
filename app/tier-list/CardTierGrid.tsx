"use client";

import Image from "next/image";
import { useState, useRef } from "react";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { TIERS, type Tier, useTierEditor } from "./useTierEditor";
import { TierRow } from "./TierRow";
import { TierShareButton } from "./TierShareButton";

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

export function CardTierGrid({ cards, storageKey }: { cards: CardItem[]; storageKey: string }) {
  const [typeFilter, setTypeFilter] = useState<(typeof CARD_TYPES)[number]>("全て");
  const [rarityFilter, setRarityFilter] = useState<(typeof RARITIES)[number]>("全て");
  const { isEditing, setIsEditing, tierLabels, updateLabel, moveItem, reset, getEffectiveTier } = useTierEditor(storageKey);
  const tierGridRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const filtered = cards.filter((c) => {
    if (typeFilter !== "全て" && c.type !== typeFilter) return false;
    if (rarityFilter !== "全て" && c.rarity !== rarityFilter) return false;
    return true;
  });

  const grouped: Record<Tier | "unrated", CardItem[]> = { S: [], A: [], B: [], C: [], D: [], unrated: [] };
  for (const card of filtered) {
    grouped[getEffectiveTier(card.id, card.tier)].push(card);
  }

  const handleDragEnd = (e: DragEndEvent) => {
    if (e.over) {
      moveItem(String(e.active.id), e.over.id as Tier | "unrated");
    }
    setSelectedId(null);
  };

  const handleTapDrop = (tier: Tier | "unrated", id: string) => {
    moveItem(id, tier);
    setSelectedId(null);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div>
        {/* フィルター */}
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex gap-2 flex-wrap">
            {CARD_TYPES.map((t) => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${typeFilter === t ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            {RARITIES.map((r) => (
              <button key={r} onClick={() => setRarityFilter(r)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${rarityFilter === r ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* 編集ボタン */}
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
          <TierShareButton targetRef={tierGridRef} filename="slay2-card-tier.png" title="スレスパ2 カードTier表" />
        </div>

        {isEditing && selectedId && (
          <p className="text-xs text-yellow-400 mb-2">移動先のTierをタップしてください</p>
        )}

        {/* Tier表 */}
        <div ref={tierGridRef} className="space-y-2">
          {TIERS.map((tier) => (
            <TierRow key={tier} tier={tier} label={tierLabels[tier]} isEditing={isEditing}
              onLabelChange={(label) => updateLabel(tier, label)}
              selectedId={selectedId}
              onTapDrop={(id) => handleTapDrop(tier, id)}
              isEmpty={grouped[tier].length === 0}>
              {grouped[tier].map((card) => (
                <DraggableItem key={card.id} id={card.id} name={card.name} imgUrl={card.imgUrl}
                  isEditing={isEditing} imgHeight={78}
                  isSelected={selectedId === card.id}
                  onSelect={() => setSelectedId(selectedId === card.id ? null : card.id)} />
              ))}
            </TierRow>
          ))}
          <TierRow tier="unrated" label="未評価" isEditing={isEditing}
            selectedId={selectedId}
            onTapDrop={(id) => handleTapDrop("unrated", id)}
            isEmpty={grouped.unrated.length === 0}>
            {grouped.unrated.map((card) => (
              <DraggableItem key={card.id} id={card.id} name={card.name} imgUrl={card.imgUrl}
                isEditing={isEditing} imgHeight={78} muted
                isSelected={selectedId === card.id}
                onSelect={() => setSelectedId(selectedId === card.id ? null : card.id)} />
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

function DraggableItem({ id, name, imgUrl, isEditing, imgHeight, muted, isSelected, onSelect }: {
  id: string; name: string; imgUrl: string; isEditing: boolean; imgHeight: number;
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
      <Image src={imgUrl} alt={name} width={56} height={imgHeight} className="object-contain rounded pointer-events-none" />
    </div>
  );
}
