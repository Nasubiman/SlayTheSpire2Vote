"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { doc, getDoc, collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getCardsByCharacter } from "@/lib/cards";
import { RATINGS, type Poll, type Card, type CardResult } from "@/lib/types";

const CARD_TYPES = ["全て", "アタック", "スキル", "パワー"] as const;

function totalVotes(r: CardResult) {
  return (r.a ?? 0) + (r.b ?? 0) + (r.c ?? 0) + (r.d ?? 0) + (r.e ?? 0);
}

function weightedScore(r: CardResult) {
  // S=5 A=4 B=3 C=2 D=1 の加重平均
  const total = totalVotes(r);
  if (total === 0) return 0;
  return (
    ((r.a ?? 0) * 5 + (r.b ?? 0) * 4 + (r.c ?? 0) * 3 + (r.d ?? 0) * 2 + (r.e ?? 0) * 1) /
    total
  );
}

export default function ResultsPage() {
  const { pollId } = useParams<{ pollId: string }>();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [results, setResults] = useState<Record<string, CardResult>>({});
  const [filter, setFilter] = useState<(typeof CARD_TYPES)[number]>("全て");
  const [sortBy, setSortBy] = useState<"score" | "name">("score");

  // poll取得
  useEffect(() => {
    getDoc(doc(db, "polls", pollId)).then((snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setPoll({
        id: snap.id,
        title: data.title,
        characterId: data.characterId,
        characterName: data.characterName,
        createdAt: data.createdAt?.toMillis() ?? 0,
      });
      setCards(getCardsByCharacter(data.characterId));
    });
  }, [pollId]);

  // リアルタイム結果購読
  useEffect(() => {
    const ref = collection(db, "polls", pollId, "results");
    const unsub = onSnapshot(ref, (snap) => {
      const data: Record<string, CardResult> = {};
      snap.docs.forEach((d) => {
        data[d.id] = d.data() as CardResult;
      });
      setResults(data);
    });
    return unsub;
  }, [pollId]);

  const EXCLUDED_CARDS = ["ストライク", "防御"];

  const filteredCards = cards
    .filter((c) => !EXCLUDED_CARDS.includes(c.name))
    .filter((c) => filter === "全て" || c.type === filter)
    .sort((a, b) => {
    if (sortBy === "score") {
      return weightedScore(results[b.id] ?? {}) - weightedScore(results[a.id] ?? {});
    }
      return a.name.localeCompare(b.name, "ja");
    });

  const totalVotesAll = Object.values(results).reduce(
    (sum, r) => sum + totalVotes(r),
    0
  );

  if (!poll) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">読み込み中...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{poll.title} — 結果</h1>
            <p className="text-gray-400 text-sm mt-1">
              {poll.characterName} · 総投票数 {totalVotesAll}
            </p>
          </div>
          <Link
            href={`/polls/${pollId}`}
            className="bg-gray-800 hover:bg-gray-700 rounded-lg px-4 py-2 text-sm transition-colors"
          >
            ← 投票する
          </Link>
        </div>

        {/* フィルター・ソート */}
        <div className="flex flex-wrap gap-2 mb-6">
          <div className="flex gap-1">
            {CARD_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  filter === t
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-1 ml-auto">
            {(["score", "name"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  sortBy === s
                    ? "bg-gray-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {s === "score" ? "スコア順" : "名前順"}
              </button>
            ))}
          </div>
        </div>

        {/* 凡例 */}
        <div className="flex gap-3 mb-4">
          {RATINGS.map((r) => (
            <span key={r.value} className="flex items-center gap-1 text-xs">
              <span className={`inline-block w-5 h-5 rounded text-center leading-5 text-xs font-bold ${r.color}`}>
                {r.label}
              </span>
            </span>
          ))}
        </div>

        {/* カード結果リスト */}
        <div className="space-y-2">
          {filteredCards.map((card) => {
            const r = results[card.id] ?? { a: 0, b: 0, c: 0, d: 0, e: 0 };
            const total = totalVotes(r);
            const score = weightedScore(r);

            return (
              <div key={card.id} className="bg-gray-900 rounded-lg px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{card.name}</span>
                    <span className="text-xs text-gray-500">{card.type}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    {total > 0 && (
                      <span>
                        avg {score.toFixed(2)} · {total}票
                      </span>
                    )}
                  </div>
                </div>

                {/* 投票バー */}
                {total > 0 ? (
                  <div className="flex rounded overflow-hidden h-5">
                    {RATINGS.map((rt) => {
                      const count = r[rt.value] ?? 0;
                      const pct = total > 0 ? (count / total) * 100 : 0;
                      if (pct === 0) return null;
                      return (
                        <div
                          key={rt.value}
                          className={`${rt.color} flex items-center justify-center text-xs font-bold transition-all`}
                          style={{ width: `${pct}%` }}
                          title={`${rt.label}: ${count}票 (${pct.toFixed(0)}%)`}
                        >
                          {pct > 8 ? rt.label : ""}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-5 bg-gray-800 rounded text-xs text-gray-600 flex items-center justify-center">
                    未投票
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
