import Image from "next/image";
import Link from "next/link";
import { getAdminDb } from "@/lib/firebase-admin";
import { CHARACTERS } from "@/lib/types";
import { getCardsByCharacter, getCardImageUrl } from "@/lib/cards";

export const dynamic = "force-dynamic";

const EXCLUDED_CARDS = ["ストライク", "防御"];

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

async function getCardScores(characterId: string): Promise<Record<string, Record<string, number>>> {
  try {
    const db = getAdminDb();
    const snap = await db.collection("polls").where("characterId", "==", characterId).get();
    if (snap.empty) return {};
    const sorted = snap.docs.slice().sort((a, b) => {
      return (b.data().createdAt?.toMillis?.() ?? 0) - (a.data().createdAt?.toMillis?.() ?? 0);
    });
    return (sorted[0].data().scores ?? {}) as Record<string, Record<string, number>>;
  } catch {
    return {};
  }
}

export default async function TierListCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { char } = await searchParams;
  const charId = typeof char === "string" && CHARACTERS.find((c) => c.id === char) ? char : "ironclad";
  const currentChar = CHARACTERS.find((c) => c.id === charId)!;

  const scores = await getCardScores(charId);
  const cards = getCardsByCharacter(charId).filter(
    (c) => !EXCLUDED_CARDS.includes(c.name) && !!getCardImageUrl(c)
  );

  // Tier分類
  const tiered: Record<Tier, typeof cards> = { S: [], A: [], B: [], C: [], D: [] };
  const unvoted: typeof cards = [];

  for (const card of cards) {
    const r = scores[card.id];
    if (!r || (r.a ?? 0) + (r.b ?? 0) + (r.c ?? 0) + (r.d ?? 0) + (r.e ?? 0) === 0) {
      unvoted.push(card);
    } else {
      tiered[getTier(weightedScore(r))].push(card);
    }
  }

  return (
    <div>
      {/* キャラクタータブ */}
      <div className="flex gap-2 flex-wrap mb-6">
        {CHARACTERS.map((c) => (
          <Link
            key={c.id}
            href={`/tier-list?char=${c.id}`}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              c.id === charId
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      <h2 className="text-lg font-semibold mb-4">{currentChar.name} カード Tier表</h2>

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
                {items.map((card) => {
                  const imgUrl = getCardImageUrl(card);
                  return (
                    <div key={card.id} className="flex flex-col items-center w-14">
                      {imgUrl && (
                        <Image
                          src={imgUrl}
                          alt={card.name}
                          width={56}
                          height={78}
                          className="object-contain rounded"
                        />
                      )}
                      <p className="text-xs text-center mt-0.5 line-clamp-2 leading-tight w-full text-gray-300">
                        {card.name}
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
              {unvoted.map((card) => {
                const imgUrl = getCardImageUrl(card);
                return (
                  <div key={card.id} className="flex flex-col items-center w-14 opacity-50">
                    {imgUrl && (
                      <Image
                        src={imgUrl}
                        alt={card.name}
                        width={56}
                        height={78}
                        className="object-contain rounded"
                      />
                    )}
                    <p className="text-xs text-center mt-0.5 line-clamp-2 leading-tight w-full text-gray-400">
                      {card.name}
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
