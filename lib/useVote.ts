"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { type Rating } from "@/lib/types";

type VoteEntry = {
  rating: Rating;
  votedAt: number; // Unix ms
};

type StoredVotes = Record<string, VoteEntry>;
type StatusState = Record<string, "idle" | "loading" | "done" | "error">;

// 日本時間（UTC+9）で同じ暦日かどうか判定
function isSameDayJST(timestamp: number): boolean {
  if (timestamp === 0) return false; // 旧形式の未設定値
  const JST = 9 * 60 * 60 * 1000;
  const toJST = (t: number) => {
    const d = new Date(t + JST);
    return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
  };
  return toJST(Date.now()) === toJST(timestamp);
}

export function useVote(pollId: string | null) {
  const [entries, setEntries] = useState<StoredVotes>({});
  const [status, setStatus] = useState<StatusState>({});

  // localStorageから復元（旧形式 Rating文字列にも対応）
  useEffect(() => {
    if (!pollId) return;
    const saved = localStorage.getItem(`votes_${pollId}`);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      const normalized: StoredVotes = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === "string") {
          // 旧形式: votedAt=0 にして「別の日」扱いにする
          normalized[k] = { rating: v as Rating, votedAt: 0 };
        } else {
          normalized[k] = v as VoteEntry;
        }
      }
      setEntries(normalized);
    } catch { /* ignore */ }
  }, [pollId]);

  // 外部インターフェースは Record<string, Rating> のまま維持
  const votes = useMemo(
    () => Object.fromEntries(Object.entries(entries).map(([k, v]) => [k, v.rating])),
    [entries]
  );

  const vote = useCallback(
    async (itemId: string, rating: Rating) => {
      if (!pollId) return;
      const current = entries[itemId];
      if (current?.rating === rating) return;

      // 当日内の変更 → prevRating を送って古い票を差し引く
      // 日をまたいだ / 初回 → prevRating なし（純粋加算）
      const prevRating = current && isSameDayJST(current.votedAt)
        ? current.rating
        : undefined;

      const newEntry: VoteEntry = { rating, votedAt: Date.now() };

      // 楽観的更新
      setEntries((e) => ({ ...e, [itemId]: newEntry }));
      setStatus((s) => ({ ...s, [itemId]: "loading" }));

      try {
        const res = await fetch("/api/vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pollId, cardId: itemId, rating, prevRating }),
        });

        if (res.ok) {
          const next = { ...entries, [itemId]: newEntry };
          localStorage.setItem(`votes_${pollId}`, JSON.stringify(next));
          setStatus((s) => ({ ...s, [itemId]: "done" }));
        } else {
          setEntries((e) => {
            const next = { ...e };
            if (current) next[itemId] = current; else delete next[itemId];
            return next;
          });
          setStatus((s) => ({ ...s, [itemId]: "error" }));
        }
      } catch {
        setEntries((e) => {
          const next = { ...e };
          if (current) next[itemId] = current; else delete next[itemId];
          return next;
        });
        setStatus((s) => ({ ...s, [itemId]: "error" }));
      }
    },
    [pollId, entries]
  );

  return { votes, status, vote };
}
