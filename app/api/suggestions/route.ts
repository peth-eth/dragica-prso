import { NextResponse } from "next/server";
import { getSuggestions, insertSuggestion } from "@/lib/db";
import { verifyTurnstile } from "@/lib/turnstile";

const MAX_TEXT = 2000;
const MAX_NAME = 120;

export async function GET() {
  const rows = await getSuggestions();
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const body = await request.json() as Record<string, unknown>;

  const name = String(body.name ?? "").trim().slice(0, MAX_NAME) || null;
  const category = String(body.category ?? "").trim().slice(0, 60) || null;
  const text = String(body.text ?? "").trim().slice(0, MAX_TEXT);
  const turnstileToken = String(body.turnstileToken ?? "");

  if (!text || text.length < 5) {
    return NextResponse.json({ error: "Prijedlog je prekratak." }, { status: 400 });
  }

  const ip = request.headers.get("cf-connecting-ip") ?? undefined;
  const valid = await verifyTurnstile(turnstileToken, ip);
  if (!valid) {
    return NextResponse.json({ error: "Provjera nije uspjela. Pokušajte ponovo." }, { status: 403 });
  }

  const id = `sug_${Date.now()}`;
  const inserted = await insertSuggestion({ id, name, category, text });
  return NextResponse.json({ suggestion: inserted });
}
