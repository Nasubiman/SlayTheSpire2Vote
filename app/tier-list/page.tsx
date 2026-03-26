import Link from "next/link";
import { getAdminDb } from "@/lib/firebase-admin";
import { CHARACTERS } from "@/lib/types";
import { getCardsByCharacter, getCardImageUrl } from "@/lib/cards";
import { CardTierGrid, type CardItem } from "./CardTierGrid";

export const dynamic = "force-dynamic";

const EXCLUDED_CARDS = ["ストライク", "防御"];

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

async function getCardScores(characterId: string): Promise<Record<string, Record<string, number>>> {
  try {
    const db = getAdminDb();
    const snap = await db.collection("polls").where("characterId", "==", characterId).get();
    if (snap.empty) return {};
    const sorted = snap.docs.slice().sort(
      (a, b) => (b.data().createdAt?.toMillis?.() ?? 0) - (a.data().createdAt?.toMillis?.() ?? 0)
    );
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
  const rawCards = getCardsByCharacter(charId).filter(
    (c) => !EXCLUDED_CARDS.includes(c.name) && !!getCardImageUrl(c)
  );

  const cards: CardItem[] = rawCards.map((card) => {
    const r = scores[card.id];
    const total = r ? (r.a ?? 0) + (r.b ?? 0) + (r.c ?? 0) + (r.d ?? 0) + (r.e ?? 0) : 0;
    return {
      id: card.id,
      name: card.name,
      type: card.type,
      rarity: card.rarity,
      imgUrl: getCardImageUrl(card)!,
      tier: total > 0 ? getTier(weightedScore(r)) : null,
    };
  });

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

      <CardTierGrid cards={cards} storageKey={`tier_overrides_cards_${charId}`} />
    </div>
  );
}
