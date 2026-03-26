import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

type VoteBody = {
  pollId: string;
  cardId: string;
  rating: "a" | "b" | "c" | "d" | "e";
  prevRating?: "a" | "b" | "c" | "d" | "e";
};

export async function POST(req: NextRequest) {
  let body: VoteBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { pollId, cardId, rating, prevRating } = body;

  if (!pollId || !cardId || !["a", "b", "c", "d", "e"].includes(rating)) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const db = getAdminDb();
  const pollRef = db.collection("polls").doc(pollId);
  const resultRef = pollRef.collection("results").doc(cardId);

  try {
    if (prevRating && prevRating !== rating) {
      // 変更: 古い評価を-1、新しい評価を+1
      await db.runTransaction(async (tx) => {
        tx.set(resultRef, { [rating]: FieldValue.increment(1), [prevRating]: FieldValue.increment(-1) }, { merge: true });
        tx.update(pollRef, {
          [`scores.${cardId}.${rating}`]: FieldValue.increment(1),
          [`scores.${cardId}.${prevRating}`]: FieldValue.increment(-1),
        });
      });
    } else if (!prevRating) {
      // 新規投票
      await db.runTransaction(async (tx) => {
        tx.set(resultRef, { [rating]: FieldValue.increment(1) }, { merge: true });
        tx.update(pollRef, {
          [`scores.${cardId}.${rating}`]: FieldValue.increment(1),
        });
      });
    }
    // prevRating === rating の場合は何もしない
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
