"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getCardsByCharacter, getCardImageUrl } from "@/lib/cards";
import { RATINGS, type Poll, type Card } from "@/lib/types";
import { useVote } from "@/lib/useVote";

type ResultsState = Record<string, { a: number; b: number; c: number; d: number; e: number }>;

const CARD_TYPES = ["全て", "アタック", "スキル", "パワー"] as const;
const RARITIES = ["全て", "コモン", "アンコモン", "レア", "スターター"] as const;

export default function PollPage() {
  const { pollId } = useParams<{ pollId: string }>();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [pollDocId, setPollDocId] = useState<string | null>(null);
  const [cards, setCards] = useState<Card[]>(() => getCardsByCharacter(pollId));
  const [filter, setFilter] = useState<(typeof CARD_TYPES)[number]>("全て");
  const [rarityFilter, setRarityFilter] = useState<(typeof RARITIES)[number]>("全て");
  const [sortBy, setSortBy] = useState<"score_desc" | "score_asc" | "name" | null>(null);
  const { votes, status, vote } = useVote(pollDocId);
  const [notFound, setNotFound] = useState(false);
  const [upgradedCards, setUpgradedCards] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<ResultsState>({});
  const [sortedCards, setSortedCards] = useState<Card[]>([]);
  const resultsRef = useRef<ResultsState>({});
  const initialResultsLoaded = useRef(false);
  const [sortTrigger, setSortTrigger] = useState(0);
  const [listReady, setListReady] = useState(false);

  // Firestoreからpoll取得（直接IDまたはcharacterIdでフォールバック）
  useEffect(() => {
    async function fetchPoll() {
      let snap = await getDoc(doc(db, "polls", pollId));

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
    }
    fetchPoll();
  }, [pollId]);

  // 結果をリアルタイムで購読（pollIdで即座に開始し、fetchPollと並列化）
  useEffect(() => {
    const targetId = pollDocId ?? pollId;
    const unsub = onSnapshot(
      doc(db, "polls", targetId),
      { includeMetadataChanges: true },
      (snap) => {
        if (snap.metadata.fromCache) return; // キャッシュは無視してサーバーデータを待つ
        const scores = (snap.data()?.scores ?? {}) as ResultsState;
        setResults(scores);
        if (!initialResultsLoaded.current) {
          initialResultsLoaded.current = true;
          setSortTrigger((t) => t + 1);
        }
      }
    );
    return () => unsub();
  }, [pollDocId, pollId]);

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
        if (sortBy === "name") return a.name.localeCompare(b.name, "ja");
        return 0;
      });
    setSortedCards(sorted);
    if (sortTrigger > 0) setListReady(true);
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

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="mb-6">
          <Link href="/" className="text-gray-400 hover:text-white text-sm transition-colors">
            ← トップに戻る
          </Link>
          <div className="mt-3">
            {!poll ? (
              <>
                <div className="h-8 w-48 bg-gray-800 rounded animate-pulse" />
                <div className="h-4 w-32 bg-gray-800 rounded animate-pulse mt-1" />
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold">{poll.title}</h1>
                <p className="text-gray-400 text-sm mt-1">
                  {poll.characterName} · {votedCount}/{cards.length} 投票済み
                </p>
              </>
            )}
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
        {!listReady ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="rounded-lg overflow-hidden border border-gray-700 bg-gray-900 animate-pulse">
                <div className="aspect-[400/560] bg-gray-800" />
                <div className="p-3">
                  <div className="flex gap-1.5">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <div key={j} className="flex-1 h-8 bg-gray-800 rounded" />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedCards.map((card, index) => {
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
                      alt={`スレスパ2 ${card.characterName}の${card.type}カード「${card.name}」${isUpgraded ? "（強化後）" : ""}`}
                      width={400}
                      height={560}
                      sizes="(max-width: 1024px) 50vw, 33vw"
                      className="w-full h-auto object-contain"
                      priority={index < 6}
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
                    const text = `【スレスパ2】${poll?.characterName ?? ""} / ${card.name} を ${ratingLabel} ランクと評価しました！ #スレスパ2 #STS2\nhttps://slaythespire2vote.vercel.app/polls/${pollId}`;
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
        )}
      </div>
    </main>
  );
}
