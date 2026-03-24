import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { CHARACTERS } from "@/lib/types";

export async function POST(req: NextRequest) {
  // 管理者キーチェック
  const adminKey = req.headers.get("x-admin-key");
  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { title: string; characterId: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { title, characterId } = body;
  const character = CHARACTERS.find((c) => c.id === characterId);

  if (!title || !character) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const db = getAdminDb();
  const ref = await db.collection("polls").add({
    title,
    characterId,
    characterName: character.name,
    createdAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ id: ref.id });
}

export async function GET() {
  const db = getAdminDb();
  const snap = await db
    .collection("polls")
    .orderBy("createdAt", "desc")
    .get();

  const polls = snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toMillis() ?? 0,
  }));

  return NextResponse.json(polls);
}
