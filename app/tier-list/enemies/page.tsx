import Image from "next/image";
import { getAdminDb } from "@/lib/firebase-admin";
import { getAllEnemies, getEnemyImageUrl } from "@/lib/enemies";

export const dynamic = "force-dynamic";

const TIERS = ["S", "A", "B", "C", "D"] as const;
type Tier = (typeof TIERS)[number];

const TIER_STYLES: Record<Tier, { bg: string; text: string; rowBg: string }> = {
  S: { bg: "bg-yellow-400", text: "text-black", rowBg: "bg-yellow-400/10 border-yellow-400/30" },
  A: { bg: "bg-red-500",    text: "text-white",  rowBg: "bg-red-500/10 border-red-500/30" },
  B: { bg: "bg-green-500",  text: "text-white",  rowBg: "bg-green-500/10 border-green-500/30" },
  C: { bg: "bg-blue-500",   text: "text-white",  rowBg: "bg-blue-500/10 border-blue-500/30" },
  D: { bg: "bg-gray-500",   text: "text-white",  rowBg: "bg-gray-500/10 border-gray-500/30" },
};

function weightedScore(r: Record<string, number>): number {
  const a = r.a ?? 0, b = r.b ?? 0, c = r.c ?? 0, d = r.d ?? 0, e = r.e ?? 0;
  const total = a + b + c + d + e;
  if (total === 0) return 0;
  return (a * 5 + b * 4 + c * 3 + d * 2 + e * 1) / total;
}

function getTier(score: number): Tier {
  if (score >= 4.2) return "S";
  if (score >= 3.5) return "A";
  if (score >= 2.8) return "B";
  if (score >= 2.0) return "C";
  return "D";
}

async function getEnemyScores(): Promise<Record<string, Record<string, number>>> {
  try {
    const db = getAdminDb();
    const snap = await db.collection("polls").doc("enemies").get();
    return (snap.data()?.scores ?? {}) as Record<string, Record<string, number>>;
  } catch {
    return {};
  }
}

export default async function TierListEnemiesPage() {
  const scores = await getEnemyScores();
  const enemies = getAllEnemies().filter((e) => !!getEnemyImageUrl(e));

  const tiered: Record<Tier, typeof enemies> = { S: [], A: [], B: [], C: [], D: [] };
  const unvoted: typeof enemies = [];

  for (const enemy of enemies) {
    const r = scores[enemy.id];
    if (!r || (r.a ?? 0) + (r.b ?? 0) + (r.c ?? 0) + (r.d ?? 0) + (r.e ?? 0) === 0) {
      unvoted.push(enemy);
    } else {
      tiered[getTier(weightedScore(r))].push(enemy);
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">敵キャラ Tier表</h2>

      <div className="space-y-2">
        {TIERS.map((tier) => {
          const items = tiered[tier];
          if (items.length === 0) return null;
          const style = TIER_STYLES[tier];
          return (
            <div key={tier} className={`flex gap-0 rounded-lg overflow-hidden border ${style.rowBg}`}>
              <div className={`${style.bg} ${style.text} w-12 flex-shrink-0 flex items-center justify-center font-bold text-xl`}>
                {tier}
              </div>
              <div className="flex flex-wrap gap-2 p-2">
                {items.map((enemy) => {
                  const imgUrl = getEnemyImageUrl(enemy);
                  return (
                    <div key={enemy.id} className="flex flex-col items-center w-14">
                      {imgUrl && (
                        <Image
                          src={imgUrl}
                          alt={enemy.name}
                          width={56}
                          height={56}
                          className="object-contain rounded bg-gray-800"
                        />
                      )}
                      <p className="text-xs text-center mt-0.5 line-clamp-2 leading-tight w-full text-gray-300">
                        {enemy.name}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {unvoted.length > 0 && (
          <div className="flex gap-0 rounded-lg overflow-hidden border border-gray-700/30 mt-4">
            <div className="bg-gray-700 text-gray-300 w-12 flex-shrink-0 flex items-center justify-center font-bold text-xs text-center leading-tight px-1">
              未評価
            </div>
            <div className="flex flex-wrap gap-2 p-2">
              {unvoted.map((enemy) => {
                const imgUrl = getEnemyImageUrl(enemy);
                return (
                  <div key={enemy.id} className="flex flex-col items-center w-14 opacity-50">
                    {imgUrl && (
                      <Image
                        src={imgUrl}
                        alt={enemy.name}
                        width={56}
                        height={56}
                        className="object-contain rounded bg-gray-800"
                      />
                    )}
                    <p className="text-xs text-center mt-0.5 line-clamp-2 leading-tight w-full text-gray-400">
                      {enemy.name}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-600 mt-6">
        S: 4.2以上 / A: 3.5以上 / B: 2.8以上 / C: 2.0以上 / D: 2.0未満（加重平均スコア）
      </p>
    </div>
  );
}
