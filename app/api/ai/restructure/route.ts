import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateNewsletterResult } from "@/lib/newsletter";

const WARNING_BY_REASON = {
  "missing-key": "Gemini API ključ nije postavljen za ovu stranicu. AI uređivanje je trenutno isključeno.",
  "provider-error": "Gemini trenutno nije vratio valjan odgovor. Ostavili smo očišćeni tekst da se ništa ne izgubi.",
  "unusable-output": "Gemini je vratio prekratak ili neuredan tekst. Ostavili smo očišćeni tekst umjesto lošeg AI nacrta.",
} as const;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json() as Record<string, unknown>;
  const rawText = String(body.rawText ?? "").trim();

  if (rawText.length < 20) {
    return NextResponse.json({ error: "Zalijepite barem nekoliko rečenica bilješki." }, { status: 400 });
  }

  const result = await generateNewsletterResult(rawText.slice(0, 8000));
  if (result.reason === "missing-key") {
    return NextResponse.json({ error: WARNING_BY_REASON[result.reason] }, { status: 503 });
  }

  return NextResponse.json({
    draft: result.draft,
    aiSource: result.source,
    warning: result.reason ? WARNING_BY_REASON[result.reason] : undefined,
  });
}
