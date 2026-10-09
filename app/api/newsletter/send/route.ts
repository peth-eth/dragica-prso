import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getNewsletterById, markNewsletterSent } from "@/lib/db";
import { sendBroadcast } from "@/lib/resend";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as { newsletterId?: string };
    const newsletterId = String(body.newsletterId ?? "").trim();
    if (!newsletterId) {
      return NextResponse.json({ error: "Nedostaje newsletterId." }, { status: 400 });
    }

    const nl = await getNewsletterById(newsletterId);
    if (!nl) {
      return NextResponse.json({ error: "Glasnik nije pronađen." }, { status: 404 });
    }
    if (nl.status === "sent") {
      return NextResponse.json({ error: "Glasnik je već poslan." }, { status: 409 });
    }

    const broadcastId = await sendBroadcast({
      title: nl.title,
      htmlContent: nl.contentHtml,
      previewText: nl.excerpt ?? undefined,
    });

    await markNewsletterSent(newsletterId, broadcastId, new Date().toISOString());
    return NextResponse.json({ success: true, broadcastId });
  } catch (error) {
    console.error("Newsletter send error:", error);
    const detail = error instanceof Error && error.message ? error.message : "Nepoznata greška pružatelja e-pošte.";
    return NextResponse.json({ error: `Slanje glasnika nije uspjelo: ${detail}` }, { status: 502 });
  }
}
