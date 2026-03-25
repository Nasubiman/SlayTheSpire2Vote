import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";

const REVOTE_PERIOD_MS = 24 * 60 * 60 * 1000; // 1日

type VoteBody = {
  pollId: string;
  cardId: string;
  rating: "a" | "b" | "c" | "d" | "e";
};

function getHashedIp(req: NextRequest): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  return crypto.createHash("sha256").update(ip).digest("hex");
}

export async function POST(req: NextRequest) {
  let body: VoteBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { pollId, cardId, rating } = body;

  if (!pollId || !cardId || !["a", "b", "c", "d", "e"].includes(rating)) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const hashedIp = getHashedIp(req);
  const db = getAdminDb();
  const voteRef = db.collection("polls").doc(pollId).collection("votes").doc(`${hashedIp}_${cardId}`);
  const resultRef = db.collection("polls").doc(pollId).collection("results").doc(cardId);

  try {
    await db.runTransaction(async (tx) => {
      const voteSnap = await tx.get(voteRef);

      if (voteSnap.exists) {
        const data = voteSnap.data()!;
        const votedAt = data.votedAt?.toMillis?.() ?? 0;
        const expired = Date.now() - votedAt > REVOTE_PERIOD_MS;

        if (!expired) {
          throw new Error("ALREADY_VOTED");
        }

        // 再投票: 古い評価を差し引いて新しい評価を加算
        const oldRating = data.rating as string;
        tx.update(voteRef, { rating, votedAt: FieldValue.serverTimestamp() });
        if (oldRating === rating) return; // 同じ評価なら結果変更不要
        tx.set(
          resultRef,
          {
            [rating]: FieldValue.increment(1),
            [oldRating]: FieldValue.increment(-1),
          },
          { merge: true }
        );
      } else {
        // 新規投票
        tx.set(voteRef, { rating, votedAt: FieldValue.serverTimestamp() });
        tx.set(resultRef, { [rating]: FieldValue.increment(1) }, { merge: true });
      }
    });
  } catch (err) {
    if (err instanceof Error && err.message === "ALREADY_VOTED") {
      return NextResponse.json(
        { error: "すでにこのカードに投票済みです" },
        { status: 409 }
      );
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
