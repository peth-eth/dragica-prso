import { NextResponse } from "next/server";
import { insertSuggestion } from "@/lib/db";
import { addSubscriber, isAlreadySubscribedError } from "@/lib/resend";
import { verifyTurnstile } from "@/lib/turnstile";

const MAX_TEXT = 2000;
const MAX_NAME = 120;

export async function POST(request: Request) {
  const body = await request.json() as Record<string, unknown>;

  const email = String(body.email ?? "").trim().toLowerCase();
  const name = String(body.name ?? "").trim().slice(0, MAX_NAME);
  const category = String(body.category ?? "").trim().slice(0, 60) || null;
  const text = String(body.text ?? "").trim().slice(0, MAX_TEXT);
  const turnstileToken = String(body.turnstileToken ?? "");

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Molimo unesite ispravnu e-mail adresu." }, { status: 400 });
  }
  if (text && text.length < 5) {
    return NextResponse.json({ error: "Prijedlog je prekratak." }, { status: 400 });
  }

  const ip = request.headers.get("cf-connecting-ip") ?? undefined;
  const valid = await verifyTurnstile(turnstileToken, ip);
  if (!valid) {
    return NextResponse.json({ error: "Provjera nije uspjela. Pokušajte ponovo." }, { status: 403 });
  }

  try {
    await addSubscriber(email, name || undefined);
  } catch (err) {
    if (!isAlreadySubscribedError(err)) {
      console.error("Public submit subscribe error:", err);
      return NextResponse.json({ error: "Pretplata nije uspjela. Pokušajte ponovo." }, { status: 502 });
    }
  }

  const inserted = text
    ? await insertSuggestion({
        id: `sug_${Date.now()}`,
        name: name || null,
        category,
        text,
      })
    : undefined;

  return NextResponse.json({
    suggestion: inserted,
    message: inserted
      ? "Hvala! Uspješno ste prijavljeni, a vaše pitanje je primljeno."
      : "Hvala! Uspješno ste prijavljeni na Dragičin glasnik.",
  });
}
