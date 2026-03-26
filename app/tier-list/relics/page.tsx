import { getAdminDb } from "@/lib/firebase-admin";
import { getAllRelics, getRelicCompactImageUrl } from "@/lib/relics";
import { RelicTierGrid, type RelicItem } from "../RelicTierGrid";

export const dynamic = "force-dynamic";

type Tier = "S" | "A" | "B" | "C" | "D";

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
  const rawRelics = getAllRelics().filter((r) => !!getRelicCompactImageUrl(r));

  const relics: RelicItem[] = rawRelics.map((relic) => {
    const r = scores[relic.id];
    const total = r ? (r.a ?? 0) + (r.b ?? 0) + (r.c ?? 0) + (r.d ?? 0) + (r.e ?? 0) : 0;
    return {
      id: relic.id,
      name: relic.name,
      rarity: relic.rarity,
      characterId: relic.characterId,
      imgUrl: getRelicCompactImageUrl(relic)!,
      tier: total > 0 ? getTier(weightedScore(r)) : null,
    };
  });

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">レリック Tier表</h2>
      <RelicTierGrid relics={relics} />
    </div>
  );
}
