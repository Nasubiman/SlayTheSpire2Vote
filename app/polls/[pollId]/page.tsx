"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
  const [sortBy, setSortBy] = useState<"score_desc" | "score_asc" | "name">("score_desc");
  const [votes, setVotes] = useState<VoteState>({});
  const [status, setStatus] = useState<StatusState>({});
  const [notFound, setNotFound] = useState(false);
  const [upgradedCards, setUpgradedCards] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<ResultsState>({});
  const [sortedCards, setSortedCards] = useState<Card[]>([]);
  const resultsRef = useRef<ResultsState>({});
  const initialResultsLoaded = useRef(false);
  const [sortTrigger, setSortTrigger] = useState(0);

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

      // localStorageから投票済み状態を復元（1日で期限切れ）
      const REVOTE_MS = 24 * 60 * 60 * 1000;
      const saved = localStorage.getItem(`votes_${snap.id}`);
      const savedTs = localStorage.getItem(`votesTs_${snap.id}`);
      if (saved) {
        const ts = savedTs ? JSON.parse(savedTs) as Record<string, number> : {};
        const now = Date.now();
        const valid = JSON.parse(saved) as VoteState;
        for (const cardId of Object.keys(valid)) {
          // タイムスタンプなし（古いデータ）または期限切れは削除
          if (!ts[cardId] || now - ts[cardId] > REVOTE_MS) {
            delete valid[cardId];
          }
        }
        setVotes(valid);
      }
    }
    fetchPoll();
  }, [pollId]);

  // 結果をリアルタイムで購読（poll documentのscoresフィールドを1読み取りで取得）
  useEffect(() => {
    if (!pollDocId) return;
    const unsub = onSnapshot(
      doc(db, "polls", pollDocId),
      (snap) => {
        const scores = (snap.data()?.scores ?? {}) as ResultsState;
        setResults(scores);
        if (!initialResultsLoaded.current) {
          initialResultsLoaded.current = true;
          setSortTrigger((t) => t + 1);
        }
      }
    );
    return () => unsub();
  }, [pollDocId]);

  const vote = useCallback(
    async (cardId: string, rating: Rating) => {
      if (!pollDocId) return;
      setStatus((s) => ({ ...s, [cardId]: "loading" }));

      const prevVote = votes[cardId];

      // 楽観的UI更新: APIの応答を待たずに即座に反映
      setResults((prev) => {
        const r = { ...(prev[cardId] ?? { a: 0, b: 0, c: 0, d: 0, e: 0 }) };
        r[rating] = (r[rating] || 0) + 1;
        if (prevVote && prevVote !== rating) {
          r[prevVote] = Math.max(0, (r[prevVote] || 0) - 1);
        }
        return { ...prev, [cardId]: r };
      });

      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId: pollDocId, cardId, rating }),
      });

      if (res.ok || res.status === 409) {
        setVotes((v) => {
          const next = { ...v, [cardId]: rating };
          localStorage.setItem(`votes_${pollDocId}`, JSON.stringify(next));
          if (res.ok) {
            const tsKey = `votesTs_${pollDocId}`;
            const ts = JSON.parse(localStorage.getItem(tsKey) ?? "{}") as Record<string, number>;
            ts[cardId] = Date.now();
            localStorage.setItem(tsKey, JSON.stringify(ts));
          }
          return next;
        });
        setStatus((s) => ({ ...s, [cardId]: "done" }));
      } else {
        // エラー時は楽観的更新を元に戻す
        setResults((prev) => {
          const r = { ...(prev[cardId] ?? { a: 0, b: 0, c: 0, d: 0, e: 0 }) };
          r[rating] = Math.max(0, (r[rating] || 0) - 1);
          if (prevVote && prevVote !== rating) {
            r[prevVote] = (r[prevVote] || 0) + 1;
          }
          return { ...prev, [cardId]: r };
        });
        setStatus((s) => ({ ...s, [cardId]: "error" }));
      }
    },
    [pollDocId, votes]
  );

  const EXCLUDED_CARDS = ["ストライク", "防御"];

  const weightedScore = (r: ResultsState[string] | undefined) => {
    if (!r) return 0;
    const total = (r.a||0)+(r.b||0)+(r.c||0)+(r.d||0)+(r.e||0);
    if (total === 0) return 0;
    return ((r.a||0)*5+(r.b||0)*4+(r.c||0)*3+(r.d||0)*2+(r.e||0)*1) / total;
  };

  // resultsの最新値をrefで保持（ソートには使うがsortedCardsの再計算トリガーにはしない）
  useEffect(() => { resultsRef.current = results; }, [results]);

  // ソート順はsortBy/filter/rarityFilter/cardsが変わった時のみ再計算
  useEffect(() => {
    const r = resultsRef.current;
    const sorted = cards
      .filter((c) => !EXCLUDED_CARDS.includes(c.name))
      .filter((c) => !!getCardImageUrl(c))
      .filter((c) => filter === "全て" || c.type === filter)
      .filter((c) => rarityFilter === "全て" || c.rarity === rarityFilter)
      .sort((a, b) => {
        if (sortBy === "score_desc") return weightedScore(r[b.id]) - weightedScore(r[a.id]);
        if (sortBy === "score_asc") return weightedScore(r[a.id]) - weightedScore(r[b.id]);
        return a.name.localeCompare(b.name, "ja");
      });
    setSortedCards(sorted);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, filter, rarityFilter, sortBy, sortTrigger]);

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
            ← トップに戻る
          </Link>
          <div className="flex items-center justify-between mt-3">
            <div>
              <h1 className="text-2xl font-bold">{poll.title}</h1>
              <p className="text-gray-400 text-sm mt-1">
                {poll.characterName} · {votedCount}/{cards.length} 投票済み
              </p>
            </div>
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
          <div className="flex gap-2 flex-wrap">
            {(["score_desc", "score_asc", "name"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                  sortBy === s
                    ? "bg-gray-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {s === "score_desc" ? "評価高い順" : s === "score_asc" ? "評価低い順" : "名前順"}
              </button>
            ))}
          </div>
        </div>

        {/* カードグリッド */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedCards.map((card) => {
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
                    <Image
                      src={imgUrl}
                      alt={card.name}
                      width={400}
                      height={560}
                      sizes="(max-width: 1024px) 50vw, 33vw"
                      className="w-full h-auto object-contain"
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
                    const total = (r.a||0)+(r.b||0)+(r.c||0)+(r.d||0)+(r.e||0);
                    if (total === 0) return null;
                    const score = weightedScore(r);
                    return (
                      <div className="mt-2">
                        <div className="flex gap-0.5 h-1.5">
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
                        <p className="text-xs text-gray-400 mt-1">avg {score.toFixed(2)} · {total}票</p>
                      </div>
                    );
                  })()}
                  {voted && (() => {
                    const ratingLabel = RATINGS.find((r) => r.value === voted)?.label ?? voted;
                    const text = `【スレスパ2】${poll.characterName} / ${card.name} を ${ratingLabel} ランクと評価しました！ #スレスパ2 #STS2\nhttps://slaythespire2vote.vercel.app/polls/${pollId}`;
                    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
                    return (
                      <a
                        href={shareUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 flex items-center justify-center gap-1.5 w-full py-1.5 rounded bg-black hover:bg-gray-900 text-white text-xs font-bold transition-colors border border-gray-700"
                      >
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        シェア
                      </a>
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
