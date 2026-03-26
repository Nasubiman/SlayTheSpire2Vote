"use client";

import { useDroppable } from "@dnd-kit/core";
import { type Tier } from "./useTierEditor";

export const TIER_STYLES: Record<Tier | "unrated", { bg: string; text: string; rowBg: string }> = {
  S:       { bg: "bg-yellow-400", text: "text-black",   rowBg: "bg-yellow-400/10 border-yellow-400/30" },
  A:       { bg: "bg-red-500",    text: "text-white",   rowBg: "bg-red-500/10 border-red-500/30" },
  B:       { bg: "bg-green-500",  text: "text-white",   rowBg: "bg-green-500/10 border-green-500/30" },
  C:       { bg: "bg-blue-500",   text: "text-white",   rowBg: "bg-blue-500/10 border-blue-500/30" },
  D:       { bg: "bg-gray-500",   text: "text-white",   rowBg: "bg-gray-500/10 border-gray-500/30" },
  unrated: { bg: "bg-gray-700",   text: "text-gray-300",rowBg: "bg-gray-700/10 border-gray-700/30" },
};

type Props = {
  tier: Tier | "unrated";
  label: string;
  isEditing: boolean;
  onLabelChange?: (label: string) => void;
  selectedId?: string | null;
  onTapDrop?: (id: string) => void;
  children: React.ReactNode;
  isEmpty?: boolean;
};

export function TierRow({ tier, label, isEditing, onLabelChange, selectedId, onTapDrop, children, isEmpty }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: tier, disabled: !isEditing });
  const style = TIER_STYLES[tier];

  if (!isEditing && isEmpty) return null;

  const canTapDrop = isEditing && !!selectedId;

  return (
    <div
      ref={setNodeRef}
      onClick={() => { if (canTapDrop && onTapDrop) onTapDrop(selectedId!); }}
      className={`flex rounded-lg overflow-hidden border transition-colors ${style.rowBg}
        ${isOver ? "ring-2 ring-white/60 brightness-125" : ""}
        ${canTapDrop ? "cursor-pointer ring-1 ring-white/20" : ""}
      `}
    >
      {/* ラベル */}
      <div className={`${style.bg} ${style.text} w-12 flex-shrink-0 flex items-center justify-center`}>
        {isEditing && tier !== "unrated" && onLabelChange ? (
          <input
            value={label}
            onChange={(e) => onLabelChange(e.target.value)}
            className="w-10 text-center font-bold text-xl bg-transparent border-b border-current outline-none"
            maxLength={4}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="font-bold text-xl">{label}</span>
        )}
      </div>

      {/* アイテム */}
      <div className={`flex flex-wrap gap-2 p-2 min-h-[3.5rem] flex-1 ${isEmpty && isEditing ? "items-center" : ""}`}>
        {isEmpty && isEditing ? (
          <span className="text-xs text-gray-500 px-2">
            {canTapDrop ? "ここをタップして移動" : "ここにドロップ"}
          </span>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
