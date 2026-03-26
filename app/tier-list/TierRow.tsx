"use client";

import { useState } from "react";
import { type Tier } from "./useTierEditor";

export const TIER_STYLES: Record<Tier | "unrated", { bg: string; text: string; rowBg: string }> = {
  S:       { bg: "bg-yellow-400", text: "text-black", rowBg: "bg-yellow-400/10 border-yellow-400/30" },
  A:       { bg: "bg-red-500",    text: "text-white",  rowBg: "bg-red-500/10 border-red-500/30" },
  B:       { bg: "bg-green-500",  text: "text-white",  rowBg: "bg-green-500/10 border-green-500/30" },
  C:       { bg: "bg-blue-500",   text: "text-white",  rowBg: "bg-blue-500/10 border-blue-500/30" },
  D:       { bg: "bg-gray-500",   text: "text-white",  rowBg: "bg-gray-500/10 border-gray-500/30" },
  unrated: { bg: "bg-gray-700",   text: "text-gray-300", rowBg: "bg-gray-700/10 border-gray-700/30" },
};

type Props = {
  tier: Tier | "unrated";
  label: string;
  isEditing: boolean;
  onLabelChange?: (label: string) => void;
  onDrop: (itemId: string) => void;
  /** タップで選択されているアイテムID（モバイル用） */
  selectedId?: string | null;
  children: React.ReactNode;
  isEmpty?: boolean;
};

export function TierRow({ tier, label, isEditing, onLabelChange, onDrop, selectedId, children, isEmpty }: Props) {
  const [isDragOver, setIsDragOver] = useState(false);
  const style = TIER_STYLES[tier];

  if (!isEditing && isEmpty) return null;

  const canTapDrop = isEditing && !!selectedId;

  return (
    <div
      className={`flex rounded-lg overflow-hidden border transition-colors ${style.rowBg} ${
        isDragOver ? "ring-2 ring-white/50" : ""
      } ${canTapDrop ? "cursor-pointer ring-1 ring-white/20" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const id = e.dataTransfer.getData("itemId");
        if (id) onDrop(id);
      }}
      onClick={() => {
        if (canTapDrop) onDrop(selectedId!);
      }}
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
      <div className={`flex flex-wrap gap-2 p-2 min-h-[3rem] flex-1 ${isEmpty && isEditing ? "items-center" : ""}`}>
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
