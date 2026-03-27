"use client";

import { useDroppable } from "@dnd-kit/core";

const TIER_COLOR_PALETTE = [
  { bg: "bg-yellow-400", text: "text-black",   rowBg: "bg-yellow-400/10 border-yellow-400/30" },
  { bg: "bg-red-500",    text: "text-white",   rowBg: "bg-red-500/10 border-red-500/30" },
  { bg: "bg-green-500",  text: "text-white",   rowBg: "bg-green-500/10 border-green-500/30" },
  { bg: "bg-blue-500",   text: "text-white",   rowBg: "bg-blue-500/10 border-blue-500/30" },
  { bg: "bg-gray-500",   text: "text-white",   rowBg: "bg-gray-500/10 border-gray-500/30" },
  { bg: "bg-orange-500", text: "text-white",   rowBg: "bg-orange-500/10 border-orange-500/30" },
  { bg: "bg-pink-500",   text: "text-white",   rowBg: "bg-pink-500/10 border-pink-500/30" },
  { bg: "bg-indigo-500", text: "text-white",   rowBg: "bg-indigo-500/10 border-indigo-500/30" },
] as const;

const UNRATED_STYLE = { bg: "bg-gray-700", text: "text-gray-300", rowBg: "bg-gray-700/10 border-gray-700/30" };

type Props = {
  tier: string;
  tierIndex?: number;
  label: string;
  isEditing: boolean;
  onLabelChange?: (label: string) => void;
  onRemove?: () => void;
  selectedId?: string | null;
  onTapDrop?: (id: string) => void;
  children: React.ReactNode;
  isEmpty?: boolean;
  mobileColumns?: 4 | 5;
};

export function TierRow({ tier, tierIndex = 0, label, isEditing, onLabelChange, onRemove, selectedId, onTapDrop, children, isEmpty, mobileColumns = 4 }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: tier, disabled: !isEditing });
  const style = tier === "unrated" ? UNRATED_STYLE : TIER_COLOR_PALETTE[tierIndex % TIER_COLOR_PALETTE.length];

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
      <div className={`${style.bg} ${style.text} w-12 flex-shrink-0 flex flex-col items-center justify-center gap-1`}>
        {isEditing && tier !== "unrated" && onLabelChange ? (
          <>
            <input
              value={label}
              onChange={(e) => onLabelChange(e.target.value)}
              className="w-10 text-center font-bold text-xl bg-transparent border-b border-current outline-none"
              maxLength={4}
              onClick={(e) => e.stopPropagation()}
            />
            {onRemove && (
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className="text-xs opacity-60 hover:opacity-100 leading-none"
                title="Tierを削除"
              >
                ✕
              </button>
            )}
          </>
        ) : (
          <span className="font-bold text-xl">{label}</span>
        )}
      </div>

      {/* アイテム */}
      <div className={`grid sm:flex sm:flex-wrap gap-2 p-2 min-h-[3.5rem] flex-1
        ${mobileColumns === 5 ? "grid-cols-5" : "grid-cols-4"}
        ${isEmpty && isEditing ? "items-center" : ""}
      `}>
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
