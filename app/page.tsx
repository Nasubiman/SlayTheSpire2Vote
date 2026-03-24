import Link from "next/link";
import { getAdminDb } from "@/lib/firebase-admin";
import { CHARACTERS, type Poll } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getPollsByCharacter(): Promise<Record<string, Poll>> {
  try {
    const db = getAdminDb();
    const snap = await db.collection("polls").orderBy("createdAt", "desc").get();
    const map: Record<string, Poll> = {};
    for (const doc of snap.docs) {
      const data = doc.data();
      // キャラクターごとに最新のpollだけ保持
      if (!map[data.characterId]) {
        map[data.characterId] = {
          id: doc.id,
          title: data.title,
          characterId: data.characterId,
          characterName: data.characterName,
          createdAt: data.createdAt?.toMillis() ?? 0,
        };
      }
    }
    return map;
  } catch {
    return {};
  }
}

export default async function HomePage() {
  const pollsByCharacter = await getPollsByCharacter();

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">Slay the Spire 2</h1>
        <p className="text-gray-400 mb-8">カード強さ投票 — キャラクターを選んでください</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {CHARACTERS.map((char) => {
            const poll = pollsByCharacter[char.id];
            return poll ? (
              <Link
                key={char.id}
                href={`/polls/${poll.id}`}
                className="bg-gray-800 hover:bg-gray-700 rounded-xl px-5 py-6 text-center transition-colors"
              >
                <p className="font-bold text-lg">{char.name}</p>
                <p className="text-xs text-gray-400 mt-1">投票する →</p>
              </Link>
            ) : (
              <div
                key={char.id}
                className="bg-gray-900 rounded-xl px-5 py-6 text-center opacity-50 cursor-not-allowed"
              >
                <p className="font-bold text-lg">{char.name}</p>
                <p className="text-xs text-gray-600 mt-1">準備中</p>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
