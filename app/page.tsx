import Link from "next/link";
import { getAdminDb } from "@/lib/firebase-admin";
import { CHARACTERS, RATINGS, type Poll } from "@/lib/types";
import { getCardsByCharacter, getCardImageUrl } from "@/lib/cards";
import { getAllRelics, getRelicImageUrl } from "@/lib/relics";

export const dynamic = "force-dynamic";

const CHARACTER_META: Record<string, { color: string; border: string; description: string }> = {
  ironclad: {
    color: "from-red-900/60 to-gray-900",
    border: "border-red-700 hover:border-red-500",
    description: "アイアンクラッド族の最後の兵士。不本意ながらも、剣と炎で敵を粉砕する。",
  },
  silent: {
    color: "from-green-900/60 to-gray-900",
    border: "border-green-700 hover:border-green-500",
    description: "塔の外から来た狩人。立ちはだかる者はすべて、ナイフと毒で仕留める。",
  },
  defect: {
    color: "from-cyan-900/60 to-gray-900",
    border: "border-cyan-700 hover:border-cyan-500",
    description: "生き延びるため、永遠に自身を改造し続けるオートマトン。戦わざるを得ない時は、オーブ機能を展開する。",
  },
  necro: {
    color: "from-purple-900/60 to-gray-900",
    border: "border-purple-700 hover:border-purple-500",
    description: "復讐を誓うスパイア生まれのリッチ。戦闘では頼れる相棒、左手のオスティを呼び出す。",
  },
  regent: {
    color: "from-orange-600/60 to-gray-900",
    border: "border-orange-500 hover:border-orange-300",
    description: "星の王座の継承者。宇宙の力を行使するが、面倒はミニオン任せ。",
  },
  colorless: {
    color: "from-gray-700/60 to-gray-900",
    border: "border-gray-600 hover:border-gray-400",
    description: "特定のキャラクターに属さない汎用カード群。どのデッキにも組み込める多彩な効果を持つ。",
  },
};

const EXCLUDED_CARDS = ["ストライク", "防御"];

function weightedScore(r: Record<string, number>) {
  const a = r.a ?? 0, b = r.b ?? 0, c = r.c ?? 0, d = r.d ?? 0, e = r.e ?? 0;
  const total = a + b + c + d + e;
  if (total === 0) return 0;
  return (a * 5 + b * 4 + c * 3 + d * 2 + e * 1) / total;
}

type CharEntry = { poll: Poll; topCardName: string | null; topCardResult: Record<string, number> | null; totalVotes: number };

async function getPollsAndTopCards(): Promise<Record<string, CharEntry>> {
  try {
    const db = getAdminDb();
    const snap = await db.collection("polls").orderBy("createdAt", "desc").get();
    const pollMap: Record<string, { id: string; data: FirebaseFirestore.DocumentData }> = {};
    for (const doc of snap.docs) {
      const data = doc.data();
      if (!pollMap[data.characterId]) pollMap[data.characterId] = { id: doc.id, data };
    }

    const result: Record<string, CharEntry> = {};

    await Promise.all(
      Object.entries(pollMap).map(async ([characterId, { id, data }]) => {
        const poll: Poll = {
          id,
          title: data.title,
          characterId: data.characterId,
          characterName: data.characterName,
          createdAt: data.createdAt?.toMillis() ?? 0,
        };

        // poll documentのscoresフィールドから結果を取得（subcollection読み取り不要）
        const resultsMap: Record<string, Record<string, number>> = (data.scores ?? {}) as Record<string, Record<string, number>>;

        const cards = getCardsByCharacter(characterId).filter(
          (c) => !EXCLUDED_CARDS.includes(c.name) && !!getCardImageUrl(c)
        );

        const totalVotes = Object.values(resultsMap).reduce(
          (sum, r) => sum + (r.a ?? 0) + (r.b ?? 0) + (r.c ?? 0) + (r.d ?? 0) + (r.e ?? 0),
          0
        );

        let topCard = null;
        let topScore = -1;
        for (const card of cards) {
          const r = resultsMap[card.id];
          if (!r) continue;
          const score = weightedScore(r);
          if (score > topScore) { topScore = score; topCard = card; }
        }

        result[characterId] = {
          poll,
          topCardName: topCard?.name ?? null,
          topCardResult: topCard ? (resultsMap[topCard.id] ?? null) : null,
          totalVotes,
        };
      })
    );

    return result;
  } catch {
    return {};
  }
}

type RelicEntry = { topRelicName: string | null; topRelicResult: Record<string, number> | null; totalVotes: number };

async function getTopRelic(): Promise<RelicEntry> {
  try {
    const db = getAdminDb();
    const snap = await db.collection("polls").doc("relics").get();
    const scores = (snap.data()?.scores ?? {}) as Record<string, Record<string, number>>;

    const relics = getAllRelics().filter((r) => !!getRelicImageUrl(r));
    const totalVotes = Object.values(scores).reduce(
      (sum, r) => sum + (r.a ?? 0) + (r.b ?? 0) + (r.c ?? 0) + (r.d ?? 0) + (r.e ?? 0),
      0
    );

    let topRelic = null;
    let topScore = -1;
    for (const relic of relics) {
      const r = scores[relic.id];
      if (!r) continue;
      const score = weightedScore(r);
      if (score > topScore) { topScore = score; topRelic = relic; }
    }

    return {
      topRelicName: topRelic?.name ?? null,
      topRelicResult: topRelic ? (scores[topRelic.id] ?? null) : null,
      totalVotes,
    };
  } catch {
    return { topRelicName: null, topRelicResult: null, totalVotes: 0 };
  }
}

export default async function HomePage() {
  const [data, relicEntry] = await Promise.all([getPollsAndTopCards(), getTopRelic()]);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">Slay the Spire 2</h1>
        <p className="text-gray-400 mb-8">カード・レリック 評価ランキング</p>

        {/* カード */}
        <h2 className="text-lg font-semibold text-gray-300 mb-3">カード</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {CHARACTERS.map((char) => {
            const meta = CHARACTER_META[char.id];
            const entry = data[char.id];

            if (!entry) {
              return (
                <div
                  key={char.id}
                  className="bg-gray-900 rounded-xl p-4 opacity-50 cursor-not-allowed border border-gray-800"
                >
                  <p className="font-bold text-lg">{char.name}</p>
                  <p className="text-xs text-gray-600 mt-1">準備中</p>
                </div>
              );
            }

            return (
              <Link
                key={char.id}
                href={`/polls/${char.id}`}
                className={`bg-gradient-to-b ${meta.color} rounded-xl p-4 border ${meta.border} transition-all hover:scale-[1.02] flex flex-col`}
              >
                <p className="font-bold text-lg">{char.name}</p>
                <p className="text-xs text-gray-300 mt-1 leading-relaxed">{meta.description}</p>

                {/* 1位カード */}
                {entry.topCardName && entry.topCardResult && (() => {
                  const r = entry.topCardResult;
                  const total = (r.a||0)+(r.b||0)+(r.c||0)+(r.d||0)+(r.e||0);
                  return (
                    <div className="mt-3 bg-black/20 rounded-lg px-3 py-2">
                      <p className="text-xs text-gray-400 mb-1">現在1位</p>
                      <p className="text-sm font-semibold truncate">{entry.topCardName}</p>
                      {total > 0 && (
                        <div className="flex gap-0.5 h-1.5 mt-1.5">
                          {RATINGS.map((rt) => {
                            const pct = ((r[rt.value] || 0) / total) * 100;
                            return pct > 0 ? (
                              <div key={rt.value} className={`${rt.color.split(" ")[0]} rounded-sm`} style={{ width: `${pct}%` }} />
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-gray-400">{entry.totalVotes.toLocaleString()}票</span>
                  <span className="text-xs text-gray-300">投票する →</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* レリック */}
        <h2 className="text-lg font-semibold text-gray-300 mt-8 mb-3">レリック</h2>
        <div>
          <Link
            href="/relics"
            className="inline-flex bg-gradient-to-b from-amber-900/60 to-gray-900 rounded-xl p-4 border border-amber-700 hover:border-amber-500 transition-all hover:scale-[1.02] flex-col w-full sm:w-56"
          >
            <p className="font-bold text-lg">全レリック</p>
            <p className="text-xs text-gray-300 mt-1 leading-relaxed">全キャラクター共通・固有レリックの強さ評価。</p>

            {relicEntry.topRelicName && relicEntry.topRelicResult && (() => {
              const r = relicEntry.topRelicResult;
              const total = (r.a||0)+(r.b||0)+(r.c||0)+(r.d||0)+(r.e||0);
              return (
                <div className="mt-3 bg-black/20 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-400 mb-1">現在1位</p>
                  <p className="text-sm font-semibold truncate">{relicEntry.topRelicName}</p>
                  {total > 0 && (
                    <div className="flex gap-0.5 h-1.5 mt-1.5">
                      {RATINGS.map((rt) => {
                        const pct = ((r[rt.value] || 0) / total) * 100;
                        return pct > 0 ? (
                          <div key={rt.value} className={`${rt.color.split(" ")[0]} rounded-sm`} style={{ width: `${pct}%` }} />
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-gray-400">{relicEntry.totalVotes.toLocaleString()}票</span>
              <span className="text-xs text-gray-300">投票する →</span>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
