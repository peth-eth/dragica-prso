import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getLatestNewsletterDraft, insertNewsletter, updateNewsletterDraft } from "@/lib/db";
import { sanitizeNewsletterHtml } from "@/lib/sanitize";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const draft = await getLatestNewsletterDraft();
  return NextResponse.json({ draft });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json() as Record<string, unknown>;
  const title = String(body.title ?? "").trim();
  const html = sanitizeNewsletterHtml(String(body.html ?? "").trim());
  const excerpt = String(body.excerpt ?? body.subtitle ?? "").trim().slice(0, 300) || null;
  const featureImage = String(body.featureImage ?? "").trim() || null;
  const existingId = String(body.id ?? "").trim();

  if (!title || !html) {
    return NextResponse.json({ error: "Nedostaje naslov ili sadržaj." }, { status: 400 });
  }

  const id = existingId || `n_${Date.now()}`;
  const rawHtml = featureImage
    ? `<figure><img src="${featureImage}" alt="${title}" /></figure>\n${html}`
    : html;

  const contentHtml = sanitizeNewsletterHtml(rawHtml);
  if (existingId) await updateNewsletterDraft(id, { title, excerpt, contentHtml });
  else await insertNewsletter({ id, title, excerpt, contentHtml, status: "draft" });

  return NextResponse.json({ success: true, id });
}
