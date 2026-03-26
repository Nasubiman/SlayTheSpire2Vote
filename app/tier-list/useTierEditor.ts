"use client";

import { useState, useEffect, useCallback } from "react";

export const TIERS = ["S", "A", "B", "C", "D"] as const;
export type Tier = (typeof TIERS)[number];

export const DEFAULT_LABELS: Record<Tier, string> = { S: "S", A: "A", B: "B", C: "C", D: "D" };

const LABELS_KEY = "tier_labels";

export function useTierEditor(overridesKey: string) {
  const [isEditing, setIsEditing] = useState(false);
  const [tierLabels, setTierLabels] = useState<Record<Tier, string>>(DEFAULT_LABELS);
  const [overrides, setOverrides] = useState<Record<string, Tier | "unrated">>({});

  useEffect(() => {
    const savedLabels = localStorage.getItem(LABELS_KEY);
    if (savedLabels) setTierLabels(JSON.parse(savedLabels));
    const savedOverrides = localStorage.getItem(overridesKey);
    if (savedOverrides) setOverrides(JSON.parse(savedOverrides));
  }, [overridesKey]);

  const updateLabel = useCallback((tier: Tier, label: string) => {
    setTierLabels((prev) => {
      const next = { ...prev, [tier]: label };
      localStorage.setItem(LABELS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const moveItem = useCallback((itemId: string, target: Tier | "unrated") => {
    setOverrides((prev) => {
      const next = { ...prev, [itemId]: target };
      localStorage.setItem(overridesKey, JSON.stringify(next));
      return next;
    });
  }, [overridesKey]);

  const reset = useCallback(() => {
    setOverrides({});
    localStorage.removeItem(overridesKey);
  }, [overridesKey]);

  const getEffectiveTier = useCallback((id: string, voteTier: Tier | null): Tier | "unrated" => {
    if (id in overrides) return overrides[id];
    return voteTier ?? "unrated";
  }, [overrides]);

  return { isEditing, setIsEditing, tierLabels, updateLabel, overrides, moveItem, reset, getEffectiveTier };
}
