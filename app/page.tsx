import Link from "next/link";
import { getAdminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";
import type { Poll } from "@/lib/types";

async function getPolls(): Promise<Poll[]> {
  try {
    const db = getAdminDb();
    const snap = await db.collection("polls").orderBy("createdAt", "desc").get();
    return snap.docs.map((doc) => ({
      id: doc.id,
      title: doc.data().title,
      characterId: doc.data().characterId,
      characterName: doc.data().characterName,
      createdAt: doc.data().createdAt?.toMillis() ?? 0,
    }));
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const polls = await getPolls();

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">Slay the Spire 2</h1>
        <p className="text-gray-400 mb-8">カード強さ投票</p>

        {polls.length === 0 ? (
          <p className="text-gray-500">現在投票はありません</p>
        ) : (
          <ul className="space-y-3">
            {polls.map((poll) => (
              <li key={poll.id}>
                <Link
                  href={`/polls/${poll.id}`}
                  className="flex items-center justify-between bg-gray-800 hover:bg-gray-700 rounded-lg px-5 py-4 transition-colors"
                >
                  <div>
                    <p className="font-semibold">{poll.title}</p>
                    <p className="text-sm text-gray-400">{poll.characterName}</p>
                  </div>
                  <span className="text-gray-400 text-sm">投票する →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
