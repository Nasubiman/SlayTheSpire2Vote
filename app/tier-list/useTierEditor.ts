"use client";

import { useState, useEffect, useCallback } from "react";

export const DEFAULT_TIER_IDS = ["S", "A", "B", "C", "D"];
export type Tier = string;

const TIERS_KEY = "tier_custom_tiers";
const LABELS_KEY = "tier_labels";

export function useTierEditor(overridesKey: string) {
  const [isEditing, setIsEditing] = useState(false);
  const [tiers, setTiers] = useState<string[]>(DEFAULT_TIER_IDS);
  const [tierLabels, setTierLabels] = useState<Record<string, string>>(
    Object.fromEntries(DEFAULT_TIER_IDS.map((t) => [t, t]))
  );
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  useEffect(() => {
    const savedTiers = localStorage.getItem(TIERS_KEY);
    if (savedTiers) setTiers(JSON.parse(savedTiers));
    const savedLabels = localStorage.getItem(LABELS_KEY);
    if (savedLabels) setTierLabels(JSON.parse(savedLabels));
    const savedOverrides = localStorage.getItem(overridesKey);
    if (savedOverrides) setOverrides(JSON.parse(savedOverrides));
  }, [overridesKey]);

  const updateLabel = useCallback((tier: string, label: string) => {
    setTierLabels((prev) => {
      const next = { ...prev, [tier]: label };
      localStorage.setItem(LABELS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const addTier = useCallback(() => {
    const newId = `tier_${Date.now()}`;
    setTiers((prev) => {
      const next = [...prev, newId];
      localStorage.setItem(TIERS_KEY, JSON.stringify(next));
      return next;
    });
    setTierLabels((prev) => {
      const next = { ...prev, [newId]: "新規" };
      localStorage.setItem(LABELS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeTier = useCallback((tierId: string) => {
    setTiers((prev) => {
      const next = prev.filter((t) => t !== tierId);
      localStorage.setItem(TIERS_KEY, JSON.stringify(next));
      return next;
    });
    setOverrides((prev) => {
      const next = { ...prev };
      for (const [itemId, t] of Object.entries(next)) {
        if (t === tierId) next[itemId] = "unrated";
      }
      localStorage.setItem(overridesKey, JSON.stringify(next));
      return next;
    });
  }, [overridesKey]);

  const moveItem = useCallback((itemId: string, target: string) => {
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

  const getEffectiveTier = useCallback((id: string, voteTier: string | null): string => {
    if (id in overrides) return overrides[id];
    if (voteTier && tiers.includes(voteTier)) return voteTier;
    return "unrated";
  }, [overrides, tiers]);

  return { isEditing, setIsEditing, tiers, tierLabels, updateLabel, addTier, removeTier, overrides, moveItem, reset, getEffectiveTier };
}
