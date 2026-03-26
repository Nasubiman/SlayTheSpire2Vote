"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getAllRelics, getRelicImageUrl, type Relic } from "@/lib/relics";
import { RATINGS, type Rating } from "@/lib/types";

type VoteState = Record<string, Rating>;
type StatusState = Record<string, "idle" | "loading" | "done" | "error">;
type ResultsState = Record<string, { a: number; b: number; c: number; d: number; e: number }>;

const RARITIES = ["全て", "スターター", "コモン", "アンコモン", "レア", "エンシェント", "ショップ"] as const;
const CHARACTERS = ["全て", "全キャラ共通", "アイアンクラッド", "サイレント", "ディフェクト", "ネクロバインダー", "リージェント"] as const;

const CHAR_ID_MAP: Record<string, string> = {
  "全キャラ共通": "all",
  "アイアンクラッド": "ironclad",
  "サイレント": "silent",
  "ディフェクト": "defect",
  "ネクロバインダー": "necro",
  "リージェント": "regent",
};

const POLL_ID = "relics";

export default function RelicsPage() {
  const [relics] = useState<Relic[]>(() => getAllRelics().filter((r) => !!getRelicImageUrl(r)));
  const [rarityFilter, setRarityFilter] = useState<(typeof RARITIES)[number]>("全て");
  const [charFilter, setCharFilter] = useState<(typeof CHARACTERS)[number]>("全て");
  const [sortBy, setSortBy] = useState<"score_desc" | "score_asc" | "name">("score_desc");
  const [votes, setVotes] = useState<VoteState>({});
  const [status, setStatus] = useState<StatusState>({});
  const [results, setResults] = useState<ResultsState>({});
  const [sortedRelics, setSortedRelics] = useState<Relic[]>([]);
  const resultsRef = useRef<ResultsState>({});
  const initialResultsLoaded = useRef(false);
  const [sortTrigger, setSortTrigger] = useState(0);

  // localStorageから投票済み状態を復元
  useEffect(() => {
    const REVOTE_MS = 24 * 60 * 60 * 1000;
    const saved = localStorage.getItem(`votes_${POLL_ID}`);
    const savedTs = localStorage.getItem(`votesTs_${POLL_ID}`);
    if (saved) {
      const ts = savedTs ? JSON.parse(savedTs) as Record<string, number> : {};
      const now = Date.now();
      const valid = JSON.parse(saved) as VoteState;
      for (const relicId of Object.keys(valid)) {
        if (!ts[relicId] || now - ts[relicId] > REVOTE_MS) {
          delete valid[relicId];
        }
      }
      setVotes(valid);
    }
  }, []);

  // 結果をリアルタイムで購読（poll documentのscoresフィールドを1読み取りで取得）
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "polls", POLL_ID),
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
  }, []);

  const vote = useCallback(async (relicId: string, rating: Rating) => {
    setStatus((s) => ({ ...s, [relicId]: "loading" }));

    const prevVote = votes[relicId];

    // 楽観的UI更新: APIの応答を待たずに即座に反映
    setResults((prev) => {
      const r = { ...(prev[relicId] ?? { a: 0, b: 0, c: 0, d: 0, e: 0 }) };
      r[rating] = (r[rating] || 0) + 1;
      if (prevVote && prevVote !== rating) {
        r[prevVote] = Math.max(0, (r[prevVote] || 0) - 1);
      }
      return { ...prev, [relicId]: r };
    });

    const res = await fetch("/api/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pollId: POLL_ID, cardId: relicId, rating }),
    });

    if (res.ok || res.status === 409) {
      setVotes((v) => {
        const next = { ...v, [relicId]: rating };
        localStorage.setItem(`votes_${POLL_ID}`, JSON.stringify(next));
        if (res.ok) {
          const tsKey = `votesTs_${POLL_ID}`;
          const ts = JSON.parse(localStorage.getItem(tsKey) ?? "{}") as Record<string, number>;
          ts[relicId] = Date.now();
          localStorage.setItem(tsKey, JSON.stringify(ts));
        }
        return next;
      });
      setStatus((s) => ({ ...s, [relicId]: "done" }));
    } else {
      // エラー時は楽観的更新を元に戻す
      setResults((prev) => {
        const r = { ...(prev[relicId] ?? { a: 0, b: 0, c: 0, d: 0, e: 0 }) };
        r[rating] = Math.max(0, (r[rating] || 0) - 1);
        if (prevVote && prevVote !== rating) {
          r[prevVote] = (r[prevVote] || 0) + 1;
        }
        return { ...prev, [relicId]: r };
      });
      setStatus((s) => ({ ...s, [relicId]: "error" }));
    }
  }, [votes]);

  const weightedScore = (r: ResultsState[string] | undefined) => {
    if (!r) return 0;
    const total = (r.a||0)+(r.b||0)+(r.c||0)+(r.d||0)+(r.e||0);
    if (total === 0) return 0;
    return ((r.a||0)*5+(r.b||0)*4+(r.c||0)*3+(r.d||0)*2+(r.e||0)*1) / total;
  };

  useEffect(() => { resultsRef.current = results; }, [results]);

  useEffect(() => {
    const r = resultsRef.current;
    const filtered = relics
      .filter((rel) => rarityFilter === "全て" || rel.rarity === rarityFilter)
      .filter((rel) => {
        if (charFilter === "全て") return true;
        const targetId = CHAR_ID_MAP[charFilter];
        return rel.characterId === targetId;
      })
      .sort((a, b) => {
        if (sortBy === "score_desc") return weightedScore(r[a.id]) === weightedScore(r[b.id]) ? 0 : weightedScore(r[b.id]) - weightedScore(r[a.id]);
        if (sortBy === "score_asc") return weightedScore(r[a.id]) - weightedScore(r[b.id]);
        return a.name.localeCompare(b.name, "ja");
      });
    setSortedRelics(filtered);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relics, rarityFilter, charFilter, sortBy, sortTrigger]);

  const votedCount = Object.keys(votes).length;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="mb-6">
          <Link href="/" className="text-gray-400 hover:text-white text-sm transition-colors">
            ← トップに戻る
          </Link>
          <div className="mt-3">
            <h1 className="text-2xl font-bold">全レリック 評価ランキング</h1>
            <p className="text-gray-400 text-sm mt-1">
              {votedCount}/{relics.length} 投票済み
            </p>
          </div>
        </div>

        {/* フィルタータブ */}
        <div className="flex flex-col gap-2 mb-6">
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
            {CHARACTERS.map((c) => (
              <button
                key={c}
                onClick={() => setCharFilter(c)}
                className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                  charFilter === c
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {c}
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

        {/* レリックグリッド */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedRelics.map((relic) => {
            const voted = votes[relic.id];
            const isLoading = status[relic.id] === "loading";
            const imgUrl = getRelicImageUrl(relic);

            return (
              <div
                key={relic.id}
                className={`rounded-lg overflow-hidden border transition-colors ${
                  voted
                    ? "bg-gray-800 border-gray-600"
                    : "bg-gray-900 border-gray-700"
                }`}
              >
                {imgUrl && (
                  <div className="relative">
                    <Image
                      src={imgUrl}
                      alt={relic.name}
                      width={160}
                      height={160}
                      sizes="(max-width: 1024px) 50vw, 33vw"
                      className="w-full h-auto object-contain"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                )}

                <div className="p-3">
                  <p className="text-sm font-semibold mb-2 truncate">{relic.name}</p>
                  <p className="text-xs text-gray-500 mb-2">{relic.rarity}</p>
                  <div className="flex gap-1.5">
                    {RATINGS.map((r) => (
                      <button
                        key={r.value}
                        onClick={() => vote(relic.id, r.value)}
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
                  {results[relic.id] && (() => {
                    const r = results[relic.id];
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
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
