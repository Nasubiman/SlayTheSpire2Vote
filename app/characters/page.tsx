"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { RATINGS } from "@/lib/types";
import { useVote } from "@/lib/useVote";

type ResultsState = Record<string, { a: number; b: number; c: number; d: number; e: number }>;

const POLL_ID = "characters";

const PLAYABLE_CHARACTERS = [
  { id: "ironclad", name: "アイアンクラッド", color: "from-red-800 to-red-950",        description: "剣と炎で敵を粉砕する戦士" },
  { id: "silent",   name: "サイレント",       color: "from-green-800 to-green-950",    description: "ナイフと毒で仕留める狩人" },
  { id: "defect",   name: "ディフェクト",     color: "from-cyan-800 to-cyan-950",      description: "オーブを操るオートマトン" },
  { id: "necro",    name: "ネクロバインダー", color: "from-purple-800 to-purple-950",  description: "左手のオスティを操るリッチ" },
  { id: "regent",   name: "リージェント",     color: "from-orange-700 to-orange-950",  description: "宇宙の力を行使する王座の継承者" },
];

export default function CharactersPage() {
  const [results, setResults] = useState<ResultsState>({});
  const [listReady, setListReady] = useState(false);
  const initialResultsLoaded = useRef(false);
  const { votes, status, vote } = useVote(POLL_ID);

  const weightedScore = (r: ResultsState[string] | undefined) => {
    if (!r) return 0;
    const total = (r.a||0)+(r.b||0)+(r.c||0)+(r.d||0)+(r.e||0);
    if (total === 0) return 0;
    return ((r.a||0)*5+(r.b||0)*4+(r.c||0)*3+(r.d||0)*2+(r.e||0)*1) / total;
  };

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "polls", POLL_ID),
      { includeMetadataChanges: true },
      (snap) => {
        if (snap.metadata.fromCache) return;
        setResults((snap.data()?.scores ?? {}) as ResultsState);
        if (!initialResultsLoaded.current) {
          initialResultsLoaded.current = true;
          setListReady(true);
        }
      }
    );
    return () => unsub();
  }, []);

  const votedCount = Object.keys(votes).length;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/" className="text-gray-400 hover:text-white text-sm transition-colors">
            ← トップに戻る
          </Link>
          <div className="mt-3">
            <h1 className="text-2xl font-bold">キャラクター 強さランキング</h1>
            <p className="text-gray-400 text-sm mt-1">{votedCount}/{PLAYABLE_CHARACTERS.length} 投票済み</p>
          </div>
        </div>

        {!listReady ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-lg overflow-hidden border border-gray-700 bg-gray-900 animate-pulse">
                <div className="aspect-video bg-gray-800" />
                <div className="p-3">
                  <div className="h-4 bg-gray-800 rounded w-3/4 mb-3" />
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
            {PLAYABLE_CHARACTERS.map((char) => {
              const voted = votes[char.id];
              const isLoading = status[char.id] === "loading";
              const r = results[char.id];
              const total = r ? (r.a||0)+(r.b||0)+(r.c||0)+(r.d||0)+(r.e||0) : 0;
              const score = weightedScore(r);

              return (
                <div
                  key={char.id}
                  className={`rounded-lg overflow-hidden border transition-colors ${
                    voted ? "bg-gray-800 border-gray-600" : "bg-gray-900 border-gray-700"
                  }`}
                >
                  {/* キャラクターカラーバナー */}
                  <div className={`aspect-video bg-gradient-to-br ${char.color} flex flex-col items-center justify-center p-4`}>
                    <p className="font-bold text-xl text-white text-center leading-tight">{char.name}</p>
                    <p className="text-xs text-white/60 mt-1 text-center">{char.description}</p>
                  </div>

                  <div className="p-3">
                    <div className="flex gap-1.5">
                      {RATINGS.map((rt) => (
                        <button
                          key={rt.value}
                          onClick={() => vote(char.id, rt.value)}
                          disabled={isLoading}
                          className={`flex-1 py-1.5 rounded text-sm font-bold transition-all ${
                            voted === rt.value
                              ? `${rt.color} ring-2 ring-white`
                              : `${rt.color} opacity-40 hover:opacity-100`
                          } disabled:cursor-not-allowed`}
                        >
                          {rt.label}
                        </button>
                      ))}
                    </div>

                    {total > 0 && (
                      <div className="mt-2">
                        <div className="flex gap-0.5 h-1.5">
                          {RATINGS.map((rt) => {
                            const pct = ((r?.[rt.value as keyof typeof r] || 0) / total) * 100;
                            return pct > 0 ? (
                              <div key={rt.value} className={`${rt.color.split(" ")[0]} rounded-sm`} style={{ width: `${pct}%` }} />
                            ) : null;
                          })}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">avg {score.toFixed(2)} · {total}票</p>
                      </div>
                    )}

                    {voted && (() => {
                      const ratingLabel = RATINGS.find((rt) => rt.value === voted)?.label ?? voted;
                      const text = `【スレスパ2】${char.name} を ${ratingLabel} ランクと評価しました！ #スレスパ2 #STS2\nhttps://slaythespire2vote.vercel.app/characters`;
                      return (
                        <a
                          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`}
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
