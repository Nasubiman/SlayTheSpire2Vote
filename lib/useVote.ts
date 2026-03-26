"use client";

import { useState, useCallback, useEffect } from "react";
import { type Rating } from "@/lib/types";

type VoteState = Record<string, Rating>;
type StatusState = Record<string, "idle" | "loading" | "done" | "error">;

export function useVote(pollId: string | null) {
  const [votes, setVotes] = useState<VoteState>({});
  const [status, setStatus] = useState<StatusState>({});

  // localStorageから投票済み状態を復元（pollId確定後に実行）
  useEffect(() => {
    if (!pollId) return;
    const saved = localStorage.getItem(`votes_${pollId}`);
    if (!saved) return;
    setVotes(JSON.parse(saved) as VoteState);
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
          body: JSON.stringify({ pollId, cardId: itemId, rating, prevRating: prevVote }),
        });

        if (res.ok) {
          localStorage.setItem(`votes_${pollId}`, JSON.stringify({ ...votes, [itemId]: rating }));
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
