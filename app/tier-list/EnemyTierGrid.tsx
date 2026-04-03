"use client";

import Image from "next/image";
import { useState, useRef } from "react";
import { DndContext, PointerSensor, useSensor, useSensors, useDraggable, type DragEndEvent } from "@dnd-kit/core";
import { type Tier, useTierEditor } from "./useTierEditor";
import { TierRow } from "./TierRow";
import { TierShareButton } from "./TierShareButton";

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
  const { isEditing, setIsEditing, tiers, tierLabels, updateLabel, addTier, removeTier, moveItem, reset, getEffectiveTier } = useTierEditor("tier_overrides_enemies");
  const tierGridRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const filtered = enemies.filter((e) => {
    if (areaFilter !== "全て" && e.area !== areaFilter) return false;
    if (typeFilter !== "全て" && e.type !== typeFilter) return false;
    return true;
  });

  const grouped: Record<string, EnemyItem[]> = {};
  for (const tier of [...tiers, "unrated"]) grouped[tier] = [];
  for (const enemy of filtered) {
    const t = getEffectiveTier(enemy.id, enemy.tier);
    (grouped[t] ?? grouped["unrated"]).push(enemy);
  }

  const handleDragEnd = (e: DragEndEvent) => {
    if (e.over) moveItem(String(e.active.id), String(e.over.id));
    setSelectedId(null);
  };

  const handleTapDrop = (tier: string, id: string) => {
    moveItem(id, tier);
    setSelectedId(null);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div>
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

        <div className="flex gap-2 mb-4 flex-wrap">
          <button onClick={() => { setIsEditing((v) => !v); setSelectedId(null); }}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors ${isEditing ? "bg-white text-gray-900" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>
            {isEditing ? "編集完了" : "編集"}
          </button>
          {isEditing && (
            <>
              <button onClick={addTier} className="px-4 py-1.5 rounded-full text-sm bg-gray-800 text-green-400 hover:bg-gray-700 transition-colors">
                + Tier追加
              </button>
              <button onClick={reset} className="px-4 py-1.5 rounded-full text-sm bg-gray-800 text-red-400 hover:bg-gray-700 transition-colors">
                リセット
              </button>
            </>
          )}
          <TierShareButton targetRef={tierGridRef} filename="slay2-enemy-tier.png" title="スレスパ2 敵キャラTier表" />
        </div>

        {isEditing && selectedId && (
          <p className="text-xs text-yellow-400 mb-2">移動先のTierをタップしてください</p>
        )}

        <div ref={tierGridRef} className="space-y-2">
          {tiers.map((tier, index) => (
            <TierRow key={tier} tier={tier} tierIndex={index} label={tierLabels[tier] ?? tier} isEditing={isEditing}
              onLabelChange={(label) => updateLabel(tier, label)}
              onRemove={() => removeTier(tier)}
              selectedId={selectedId} onTapDrop={(id) => handleTapDrop(tier, id)}
              isEmpty={(grouped[tier] ?? []).length === 0}>
              {(grouped[tier] ?? []).map((enemy) => (
                <DraggableItem key={enemy.id} id={enemy.id} imgUrl={enemy.imgUrl}
                  alt={`スレスパ2 ${enemy.area}の${enemy.type}「${enemy.name}」`}
                  isEditing={isEditing}
                  isSelected={selectedId === enemy.id}
                  onSelect={() => setSelectedId(selectedId === enemy.id ? null : enemy.id)} />
              ))}
            </TierRow>
          ))}
          <TierRow tier="unrated" label="未評価" isEditing={isEditing}
            selectedId={selectedId} onTapDrop={(id) => handleTapDrop("unrated", id)}
            isEmpty={(grouped["unrated"] ?? []).length === 0}>
            {(grouped["unrated"] ?? []).map((enemy) => (
              <DraggableItem key={enemy.id} id={enemy.id} imgUrl={enemy.imgUrl}
                alt={`スレスパ2 ${enemy.area}の${enemy.type}「${enemy.name}」`}
                isEditing={isEditing} muted
                isSelected={selectedId === enemy.id}
                onSelect={() => setSelectedId(selectedId === enemy.id ? null : enemy.id)} />
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

function DraggableItem({ id, imgUrl, alt, isEditing, muted, isSelected, onSelect }: {
  id: string; imgUrl: string; alt: string; isEditing: boolean;
  muted?: boolean; isSelected?: boolean; onSelect?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id, disabled: !isEditing });
  const style = transform ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)`, zIndex: 50 } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      onClick={(e) => { if (isEditing) { e.stopPropagation(); onSelect?.(); } }}
      className={`flex flex-col items-center w-full sm:w-14
        ${isEditing ? "touch-none" : ""}
        ${isDragging ? "opacity-50" : "transition-transform"}
        ${isEditing ? "cursor-grab active:cursor-grabbing" : ""}
        ${muted && !isSelected ? "opacity-50" : ""}
        ${isSelected ? "ring-2 ring-yellow-400 rounded scale-110" : ""}
      `}>
      <Image src={imgUrl} alt={alt} width={56} height={56} className="w-full h-auto object-contain rounded bg-gray-800 pointer-events-none" unoptimized />
    </div>
  );
}
