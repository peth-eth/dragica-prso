import { NextResponse } from "next/server";
import { addSubscriber, isAlreadySubscribedError } from "@/lib/resend";
import { verifyTurnstile } from "@/lib/turnstile";

export async function POST(request: Request) {
  const body = await request.json() as Record<string, unknown>;
  const email = String(body.email ?? "").trim().toLowerCase();
  const name = String(body.name ?? "").trim() || undefined;
  const turnstileToken = String(body.turnstileToken ?? "");

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Molimo unesite ispravnu e-mail adresu." }, { status: 400 });
  }

  const ip = request.headers.get("cf-connecting-ip") ?? undefined;
  const valid = await verifyTurnstile(turnstileToken, ip);
  if (!valid) {
    return NextResponse.json({ error: "Provjera nije uspjela. Pokušajte ponovo." }, { status: 403 });
  }

  try {
    await addSubscriber(email, name);
    return NextResponse.json({ success: true, message: "Uspješno ste prijavljeni na Dragičin glasnik." });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (isAlreadySubscribedError(err) || msg.includes("already") || msg.includes("422")) {
      return NextResponse.json({ success: true, message: "Već ste upisani. Hvala!" });
    }
    console.error("Subscribe error:", err);
    return NextResponse.json({ error: "Pretplata nije uspjela. Pokušajte ponovo." }, { status: 502 });
  }
}
