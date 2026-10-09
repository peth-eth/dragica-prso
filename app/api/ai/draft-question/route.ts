import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { draftQuestion } from "@/lib/newsletter";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json() as Record<string, unknown>;
  const name = String(body.name ?? "").trim().slice(0, 120);
  const category = String(body.category ?? "").trim().slice(0, 60);
  const text = String(body.text ?? "").trim().slice(0, 2000);

  if (!text) {
    return NextResponse.json({ error: "Prijedlog je prazan." }, { status: 400 });
  }

  const result = await draftQuestion({ name, category, text });
  return NextResponse.json(result);
}
