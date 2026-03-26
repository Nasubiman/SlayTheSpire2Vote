"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getAllEnemies, getEnemyImageUrl, type Enemy } from "@/lib/enemies";
import { RATINGS, type Rating } from "@/lib/types";

type VoteState = Record<string, Rating>;
type StatusState = Record<string, "idle" | "loading" | "done" | "error">;
type ResultsState = Record<string, { a: number; b: number; c: number; d: number; e: number }>;

const AREAS = ["全て", "繁茂の地", "地下水路", "魔窟", "栄光の路"] as const;
const TYPES = ["全て", "通常", "エリート", "ボス"] as const;

const POLL_ID = "enemies";

export default function EnemiesPage() {
  const [enemies] = useState<Enemy[]>(() => getAllEnemies().filter((e) => !!getEnemyImageUrl(e)));
  const [areaFilter, setAreaFilter] = useState<(typeof AREAS)[number]>("全て");
  const [typeFilter, setTypeFilter] = useState<(typeof TYPES)[number]>("全て");
  const [sortBy, setSortBy] = useState<"score_desc" | "score_asc" | "name">("score_desc");
  const [votes, setVotes] = useState<VoteState>({});
  const [status, setStatus] = useState<StatusState>({});
  const [results, setResults] = useState<ResultsState>({});
  const [sortedEnemies, setSortedEnemies] = useState<Enemy[]>([]);
  const resultsRef = useRef<ResultsState>({});
  const initialResultsLoaded = useRef(false);
  const [sortTrigger, setSortTrigger] = useState(0);

  useEffect(() => {
    const REVOTE_MS = 24 * 60 * 60 * 1000;
    const saved = localStorage.getItem(`votes_${POLL_ID}`);
    const savedTs = localStorage.getItem(`votesTs_${POLL_ID}`);
    if (saved) {
      const ts = savedTs ? (JSON.parse(savedTs) as Record<string, number>) : {};
      const now = Date.now();
      const valid = JSON.parse(saved) as VoteState;
      for (const id of Object.keys(valid)) {
        if (!ts[id] || now - ts[id] > REVOTE_MS) delete valid[id];
      }
      setVotes(valid);
    }
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "polls", POLL_ID), (snap) => {
      const scores = (snap.data()?.scores ?? {}) as ResultsState;
      setResults(scores);
      if (!initialResultsLoaded.current) {
        initialResultsLoaded.current = true;
        setSortTrigger((t) => t + 1);
      }
    });
    return () => unsub();
  }, []);

  const weightedScore = (r: ResultsState[string] | undefined) => {
    if (!r) return 0;
    const total = (r.a||0)+(r.b||0)+(r.c||0)+(r.d||0)+(r.e||0);
    if (total === 0) return 0;
    return ((r.a||0)*5+(r.b||0)*4+(r.c||0)*3+(r.d||0)*2+(r.e||0)*1) / total;
  };

  useEffect(() => { resultsRef.current = results; }, [results]);

  useEffect(() => {
    const r = resultsRef.current;
    const filtered = enemies
      .filter((e) => areaFilter === "全て" || e.area === areaFilter)
      .filter((e) => typeFilter === "全て" || e.type === typeFilter)
      .sort((a, b) => {
        if (sortBy === "score_desc") return weightedScore(r[b.id]) - weightedScore(r[a.id]);
        if (sortBy === "score_asc") return weightedScore(r[a.id]) - weightedScore(r[b.id]);
        return a.name.localeCompare(b.name, "ja");
      });
    setSortedEnemies(filtered);
  }, [enemies, areaFilter, typeFilter, sortBy, sortTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  const vote = useCallback(async (enemyId: string, rating: Rating) => {
    setStatus((s) => ({ ...s, [enemyId]: "loading" }));
    const prevVote = votes[enemyId];

    setResults((prev) => {
      const r = { ...(prev[enemyId] ?? { a: 0, b: 0, c: 0, d: 0, e: 0 }) };
      r[rating] = (r[rating] || 0) + 1;
      if (prevVote && prevVote !== rating) r[prevVote] = Math.max(0, (r[prevVote] || 0) - 1);
      return { ...prev, [enemyId]: r };
    });

    const res = await fetch("/api/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pollId: POLL_ID, cardId: enemyId, rating }),
    });

    if (res.ok || res.status === 409) {
      setVotes((v) => {
        const next = { ...v, [enemyId]: rating };
        localStorage.setItem(`votes_${POLL_ID}`, JSON.stringify(next));
        const tsKey = `votesTs_${POLL_ID}`;
        const ts = JSON.parse(localStorage.getItem(tsKey) ?? "{}") as Record<string, number>;
        if (!ts[enemyId]) ts[enemyId] = Date.now();
        localStorage.setItem(tsKey, JSON.stringify(ts));
        return next;
      });
      setStatus((s) => ({ ...s, [enemyId]: "done" }));
    } else {
      setResults((prev) => {
        const r = { ...(prev[enemyId] ?? { a: 0, b: 0, c: 0, d: 0, e: 0 }) };
        r[rating] = Math.max(0, (r[rating] || 0) - 1);
        if (prevVote && prevVote !== rating) r[prevVote] = (r[prevVote] || 0) + 1;
        return { ...prev, [enemyId]: r };
      });
      setStatus((s) => ({ ...s, [enemyId]: "error" }));
    }
  }, [votes]);

  const votedCount = Object.keys(votes).length;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/" className="text-gray-400 hover:text-white text-sm transition-colors">
            ← トップに戻る
          </Link>
          <div className="mt-3">
            <h1 className="text-2xl font-bold">全敵キャラ 強さランキング</h1>
            <p className="text-gray-400 text-sm mt-1">{votedCount}/{enemies.length} 投票済み</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 mb-6">
          <div className="flex gap-2 flex-wrap">
            {AREAS.map((a) => (
              <button
                key={a}
                onClick={() => setAreaFilter(a)}
                className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                  areaFilter === a ? "bg-green-700 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                  typeFilter === t ? "bg-red-700 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["score_desc", "score_asc", "name"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                  sortBy === s ? "bg-gray-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {s === "score_desc" ? "評価高い順" : s === "score_asc" ? "評価低い順" : "名前順"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedEnemies.map((enemy) => {
            const voted = votes[enemy.id];
            const isLoading = status[enemy.id] === "loading";
            const imgUrl = getEnemyImageUrl(enemy);

            return (
              <div
                key={enemy.id}
                className={`rounded-lg overflow-hidden border transition-colors ${
                  voted ? "bg-gray-800 border-gray-600" : "bg-gray-900 border-gray-700"
                }`}
              >
                {imgUrl && (
                  <Image
                    src={imgUrl}
                    alt={enemy.name}
                    width={400}
                    height={400}
                    sizes="(max-width: 1024px) 50vw, 33vw"
                    className="w-full h-auto object-contain bg-gray-800"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                )}
                <div className="p-3">
                  <p className="text-sm font-semibold mb-1 truncate">{enemy.name}</p>
                  <p className="text-xs text-gray-500 mb-2">{enemy.area} · {enemy.type}</p>
                  <div className="flex gap-1.5">
                    {RATINGS.map((r) => (
                      <button
                        key={r.value}
                        onClick={() => vote(enemy.id, r.value)}
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
                  {results[enemy.id] && (() => {
                    const r = results[enemy.id];
                    const total = (r.a||0)+(r.b||0)+(r.c||0)+(r.d||0)+(r.e||0);
                    if (total === 0) return null;
                    const score = weightedScore(r);
                    return (
                      <div className="mt-2">
                        <div className="flex gap-0.5 h-1.5">
                          {RATINGS.map((rt) => {
                            const pct = ((r[rt.value as keyof typeof r] || 0) / total) * 100;
                            return pct > 0 ? (
                              <div key={rt.value} className={`${rt.color.split(" ")[0]} rounded-sm`} style={{ width: `${pct}%` }} />
                            ) : null;
                          })}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">avg {score.toFixed(2)} · {total}票</p>
                      </div>
                    );
                  })()}
                  {voted && (() => {
                    const ratingLabel = RATINGS.find((r) => r.value === voted)?.label ?? voted;
                    const text = `【スレスパ2】${enemy.name} を ${ratingLabel} ランクと評価しました！ #スレスパ2 #STS2\nhttps://slaythespire2vote.vercel.app/enemies`;
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
