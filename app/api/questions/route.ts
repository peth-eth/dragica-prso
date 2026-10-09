import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getQuestions, insertQuestion } from "@/lib/db";

export async function GET() {
  const rows = await getQuestions();
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json() as Record<string, unknown>;
  const title = String(body.title ?? "").trim();
  const category = String(body.category ?? "").trim();
  const questionText = String(body.questionText ?? "").trim();

  if (!title || !questionText) {
    return NextResponse.json({ error: "Nedostaje naslov ili tekst pitanja." }, { status: 400 });
  }

  const id = `q_${Date.now()}`;
  await insertQuestion({
    id,
    title,
    date: new Date().toISOString().slice(0, 10),
    category: category || "Opće",
    questionText,
    answerText: String(body.answerText ?? "").trim() || null,
    aiSummary: String(body.aiSummary ?? "").trim() || null,
    status: String(body.status ?? "Upućeno").trim(),
    askedBy: "Dragica Pršo",
  });

  return NextResponse.json({ success: true, id });
}
