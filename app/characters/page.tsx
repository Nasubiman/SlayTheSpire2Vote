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
  { id: "ironclad", name: "アイアンクラッド", color: "from-red-900/80 to-red-950",    border: "border-red-700",   description: "剣と炎で敵を粉砕する戦士" },
  { id: "silent",   name: "サイレント",       color: "from-green-900/80 to-green-950", border: "border-green-700", description: "ナイフと毒で仕留める狩人" },
  { id: "defect",   name: "ディフェクト",     color: "from-cyan-900/80 to-cyan-950",   border: "border-cyan-700",  description: "オーブを操るオートマトン" },
  { id: "necro",    name: "ネクロバインダー", color: "from-purple-900/80 to-purple-950", border: "border-purple-700", description: "左手のオスティを操るリッチ" },
  { id: "regent",   name: "リージェント",     color: "from-orange-900/80 to-orange-950", border: "border-orange-700", description: "宇宙の力を行使する王座の継承者" },
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
        const scores = (snap.data()?.scores ?? {}) as ResultsState;
        setResults(scores);
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
      <div className="max-w-2xl mx-auto px-4 py-8">
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
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-gray-700 bg-gray-900 animate-pulse h-28" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {PLAYABLE_CHARACTERS.map((char) => {
              const voted = votes[char.id];
              const isLoading = status[char.id] === "loading";
              const r = results[char.id];
              const total = r ? (r.a||0)+(r.b||0)+(r.c||0)+(r.d||0)+(r.e||0) : 0;
              const score = weightedScore(r);

              return (
                <div
                  key={char.id}
                  className={`rounded-lg border transition-colors bg-gradient-to-r ${char.color} ${char.border} ${voted ? "border-opacity-100" : "border-opacity-60"}`}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-bold text-lg">{char.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{char.description}</p>
                      </div>
                      {total > 0 && (
                        <div className="text-right">
                          <p className="text-lg font-bold text-white">{score.toFixed(2)}</p>
                          <p className="text-xs text-gray-400">{total}票</p>
                        </div>
                      )}
                    </div>

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
                      <div className="flex gap-0.5 h-1.5 mt-2">
                        {RATINGS.map((rt) => {
                          const pct = ((r?.[rt.value as keyof typeof r] || 0) / total) * 100;
                          return pct > 0 ? (
                            <div key={rt.value} className={`${rt.color.split(" ")[0]} rounded-sm`} style={{ width: `${pct}%` }} />
                          ) : null;
                        })}
                      </div>
                    )}
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
