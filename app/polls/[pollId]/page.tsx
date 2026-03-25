"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getCardsByCharacter, getCardImageUrl } from "@/lib/cards";
import { RATINGS, type Poll, type Card, type Rating } from "@/lib/types";

type VoteState = Record<string, Rating>;
type StatusState = Record<string, "idle" | "loading" | "done" | "error">;
type ResultsState = Record<string, { a: number; b: number; c: number; d: number; e: number }>;

const CARD_TYPES = ["全て", "アタック", "スキル", "パワー"] as const;
const RARITIES = ["全て", "コモン", "アンコモン", "レア", "スターター"] as const;

export default function PollPage() {
  const { pollId } = useParams<{ pollId: string }>();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [pollDocId, setPollDocId] = useState<string | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [filter, setFilter] = useState<(typeof CARD_TYPES)[number]>("全て");
  const [rarityFilter, setRarityFilter] = useState<(typeof RARITIES)[number]>("全て");
  const [votes, setVotes] = useState<VoteState>({});
  const [status, setStatus] = useState<StatusState>({});
  const [notFound, setNotFound] = useState(false);
  const [upgradedCards, setUpgradedCards] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<ResultsState>({});

  // Firestoreからpoll取得（直接IDまたはcharacterIdでフォールバック）
  useEffect(() => {
    async function fetchPoll() {
      let snap = await getDoc(doc(db, "polls", pollId));

      // 直接IDで見つからない場合はcharacterIdで検索
      if (!snap.exists()) {
        const q = query(
          collection(db, "polls"),
          where("characterId", "==", pollId),
          orderBy("createdAt", "desc"),
          limit(1)
        );
        const qs = await getDocs(q);
        if (qs.empty) { setNotFound(true); return; }
        snap = qs.docs[0] as typeof snap;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = snap.data() as Record<string, any>;
      if (!data) { setNotFound(true); return; }
      const p: Poll = {
        id: snap.id,
        title: data.title,
        characterId: data.characterId,
        characterName: data.characterName,
        createdAt: data.createdAt?.toMillis() ?? 0,
      };
      setPollDocId(snap.id);
      setPoll(p);
      setCards(getCardsByCharacter(data.characterId));

      // localStorageから投票済み状態を復元
      const saved = localStorage.getItem(`votes_${snap.id}`);
      if (saved) setVotes(JSON.parse(saved));
    }
    fetchPoll();
  }, [pollId]);

  // 結果をリアルタイムで購読
  useEffect(() => {
    if (!pollDocId) return;
    const unsub = onSnapshot(
      collection(db, "polls", pollDocId, "results"),
      (snap) => {
        const r: ResultsState = {};
        snap.forEach((d) => {
          r[d.id] = d.data() as ResultsState[string];
        });
        setResults(r);
      }
    );
    return () => unsub();
  }, [pollDocId]);

  const vote = useCallback(
    async (cardId: string, rating: Rating) => {
      if (!pollDocId) return;
      setStatus((s) => ({ ...s, [cardId]: "loading" }));

      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId: pollDocId, cardId, rating }),
      });

      if (res.ok || res.status === 409) {
        // 409（投票済み）も含め、選択状態を確定
        setVotes((v) => {
          const next = { ...v, [cardId]: rating };
          localStorage.setItem(`votes_${pollDocId}`, JSON.stringify(next));
          return next;
        });
        setStatus((s) => ({ ...s, [cardId]: "done" }));
      } else {
        setStatus((s) => ({ ...s, [cardId]: "error" }));
      }
    },
    [pollDocId]
  );

  const EXCLUDED_CARDS = ["ストライク", "防御"];

  const filteredCards = cards
    .filter((c) => !EXCLUDED_CARDS.includes(c.name))
    .filter((c) => !!getCardImageUrl(c))
    .filter((c) => filter === "全て" || c.type === filter)
    .filter((c) => rarityFilter === "全て" || c.rarity === rarityFilter);

  const votedCount = Object.keys(votes).length;

  if (notFound) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">投票が見つかりません</p>
      </main>
    );
  }

  if (!poll) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">読み込み中...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="mb-6">
          <Link href="/" className="text-gray-400 hover:text-white text-sm transition-colors">
            ← キャラクター選択に戻る
          </Link>
          <div className="flex items-center justify-between mt-3">
            <div>
              <h1 className="text-2xl font-bold">{poll.title}</h1>
              <p className="text-gray-400 text-sm mt-1">
                {poll.characterName} · {votedCount}/{cards.length} 投票済み
              </p>
            </div>
            <Link
              href={`/polls/${pollId}/results`}
              className="bg-gray-800 hover:bg-gray-700 rounded-lg px-4 py-2 text-sm transition-colors"
            >
              結果を見る →
            </Link>
          </div>
        </div>

        {/* フィルタータブ */}
        <div className="flex flex-col gap-2 mb-6">
          <div className="flex gap-2 flex-wrap">
            {CARD_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                  filter === t
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            {RARITIES.map((r) => (
              <button
                key={r}
                onClick={() => setRarityFilter(r)}
                className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                  rarityFilter === r
                    ? "bg-purple-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* カードグリッド */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCards.map((card) => {
            const voted = votes[card.id];
            const isLoading = status[card.id] === "loading";
            const isUpgraded = upgradedCards[card.id] ?? false;
            const hasUpgraded = !!getCardImageUrl(card, true);
            const imgUrl = getCardImageUrl(card, isUpgraded) ?? getCardImageUrl(card);

            return (
              <div
                key={card.id}
                className={`rounded-lg overflow-hidden border transition-colors ${
                  voted
                    ? "bg-gray-800 border-gray-600"
                    : "bg-gray-900 border-gray-700"
                }`}
              >
                {/* カード画像 + 強化トグル */}
                {imgUrl && (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgUrl}
                      alt={card.name}
                      className="w-full object-contain"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                    {hasUpgraded && (
                      <button
                        onClick={() => setUpgradedCards((u) => ({ ...u, [card.id]: !u[card.id] }))}
                        className={`absolute bottom-2 right-2 px-2 py-0.5 rounded-full text-xs transition-colors ${
                          isUpgraded
                            ? "bg-purple-600 text-white"
                            : "bg-gray-800/80 text-gray-300 hover:bg-gray-700"
                        }`}
                      >
                        {isUpgraded ? "強化後" : "強化前"}
                      </button>
                    )}
                  </div>
                )}

                {/* レーティングボタン + みんなの評価 */}
                <div className="p-3">
                  <div className="flex gap-1.5">
                    {RATINGS.map((r) => (
                      <button
                        key={r.value}
                        onClick={() => vote(card.id, r.value)}
                        disabled={isLoading}
                        className={`flex-1 py-1.5 rounded text-sm font-bold transition-all ${
                          voted === r.value
                            ? `${r.color} ring-2 ring-white`
                            : `${r.color} opacity-40 hover:opacity-100`
                        } disabled:cursor-not-allowed`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                  {results[card.id] && (() => {
                    const r = results[card.id];
                    const total = (r.a || 0) + (r.b || 0) + (r.c || 0) + (r.d || 0) + (r.e || 0);
                    if (total === 0) return null;
                    return (
                      <div className="mt-2 flex gap-0.5 h-1.5">
                        {RATINGS.map((rt) => {
                          const count = r[rt.value as keyof typeof r] || 0;
                          const pct = (count / total) * 100;
                          return pct > 0 ? (
                            <div
                              key={rt.value}
                              className={`${rt.color.split(" ")[0]} rounded-sm`}
                              style={{ width: `${pct}%` }}
                              title={`${rt.label}: ${count}票`}
                            />
                          ) : null;
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
