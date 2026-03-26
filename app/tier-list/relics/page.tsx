import Image from "next/image";
import { getAdminDb } from "@/lib/firebase-admin";
import { getAllRelics, getRelicImageUrl } from "@/lib/relics";

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

async function getRelicScores(): Promise<Record<string, Record<string, number>>> {
  try {
    const db = getAdminDb();
    const snap = await db.collection("polls").doc("relics").get();
    return (snap.data()?.scores ?? {}) as Record<string, Record<string, number>>;
  } catch {
    return {};
  }
}

export default async function TierListRelicsPage() {
  const scores = await getRelicScores();
  const relics = getAllRelics().filter((r) => !!getRelicImageUrl(r));

  const tiered: Record<Tier, typeof relics> = { S: [], A: [], B: [], C: [], D: [] };
  const unvoted: typeof relics = [];

  for (const relic of relics) {
    const r = scores[relic.id];
    if (!r || (r.a ?? 0) + (r.b ?? 0) + (r.c ?? 0) + (r.d ?? 0) + (r.e ?? 0) === 0) {
      unvoted.push(relic);
    } else {
      tiered[getTier(weightedScore(r))].push(relic);
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">レリック Tier表</h2>

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
                {items.map((relic) => {
                  const imgUrl = getRelicImageUrl(relic);
                  return (
                    <div key={relic.id} className="flex flex-col items-center w-14">
                      {imgUrl && (
                        <Image
                          src={imgUrl}
                          alt={relic.name}
                          width={56}
                          height={56}
                          className="object-contain rounded"
                        />
                      )}
                      <p className="text-xs text-center mt-0.5 line-clamp-2 leading-tight w-full text-gray-300">
                        {relic.name}
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
              {unvoted.map((relic) => {
                const imgUrl = getRelicImageUrl(relic);
                return (
                  <div key={relic.id} className="flex flex-col items-center w-14 opacity-50">
                    {imgUrl && (
                      <Image
                        src={imgUrl}
                        alt={relic.name}
                        width={56}
                        height={56}
                        className="object-contain rounded"
                      />
                    )}
                    <p className="text-xs text-center mt-0.5 line-clamp-2 leading-tight w-full text-gray-400">
                      {relic.name}
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
