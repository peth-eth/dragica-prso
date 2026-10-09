import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { analyzeQuestion } from "@/lib/newsletter";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json() as Record<string, unknown>;
  const title = String(body.title ?? "").trim().slice(0, 300);
  const questionText = String(body.questionText ?? "").trim().slice(0, 2000);
  const answerText = String(body.answerText ?? "").trim().slice(0, 1000);

  if (!title || !questionText) {
    return NextResponse.json({ error: "Nedostaje naslov ili tekst pitanja." }, { status: 400 });
  }

  const aiSummary = await analyzeQuestion({ title, questionText, answerText });
  return NextResponse.json({ aiSummary });
}
