"use client";

import { useState, useCallback, useEffect } from "react";
import { type Rating } from "@/lib/types";

type VoteState = Record<string, Rating>;
type StatusState = Record<string, "idle" | "loading" | "done" | "error">;

const REVOTE_MS = 24 * 60 * 60 * 1000;

export function useVote(pollId: string | null) {
  const [votes, setVotes] = useState<VoteState>({});
  const [status, setStatus] = useState<StatusState>({});

  // localStorageから投票済み状態を復元（pollId確定後に実行）
  useEffect(() => {
    if (!pollId) return;
    const saved = localStorage.getItem(`votes_${pollId}`);
    const savedTs = localStorage.getItem(`votesTs_${pollId}`);
    if (!saved) return;
    const ts = savedTs ? (JSON.parse(savedTs) as Record<string, number>) : {};
    const now = Date.now();
    const valid = JSON.parse(saved) as VoteState;
    for (const id of Object.keys(valid)) {
      if (!ts[id] || now - ts[id] > REVOTE_MS) delete valid[id];
    }
    setVotes(valid);
  }, [pollId]);

  const vote = useCallback(
    async (itemId: string, rating: Rating) => {
      if (!pollId) return;
      if (votes[itemId] === rating) return;

      const prevVote = votes[itemId];

      // ボタン状態のみ楽観的更新（results はonSnapshotに任せる）
      setVotes((v) => ({ ...v, [itemId]: rating }));
      setStatus((s) => ({ ...s, [itemId]: "loading" }));

      try {
        const res = await fetch("/api/vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pollId, cardId: itemId, rating }),
        });

        if (res.ok || res.status === 409) {
          const savedVotes = { ...votes, [itemId]: rating };
          localStorage.setItem(`votes_${pollId}`, JSON.stringify(savedVotes));
          const tsKey = `votesTs_${pollId}`;
          const ts = JSON.parse(localStorage.getItem(tsKey) ?? "{}") as Record<string, number>;
          if (!ts[itemId] || res.ok) ts[itemId] = Date.now();
          localStorage.setItem(tsKey, JSON.stringify(ts));
          setStatus((s) => ({ ...s, [itemId]: "done" }));
        } else {
          // サーバーエラー: ボタン状態を元に戻す
          setVotes((v) => {
            const next = { ...v };
            if (prevVote !== undefined) next[itemId] = prevVote;
            else delete next[itemId];
            return next;
          });
          setStatus((s) => ({ ...s, [itemId]: "error" }));
        }
      } catch {
        // ネットワークエラー: ボタン状態を元に戻す
        setVotes((v) => {
          const next = { ...v };
          if (prevVote !== undefined) next[itemId] = prevVote;
          else delete next[itemId];
          return next;
        });
        setStatus((s) => ({ ...s, [itemId]: "error" }));
      }
    },
    [pollId, votes]
  );

  return { votes, status, vote };
}
