import { tursoExecute, tursoBatch } from "@/lib/turso";
import type { CouncilQuestion, Newsletter, Suggestion } from "@/lib/types";

// ─── questions ────────────────────────────────────────────────────────────────

export async function getQuestions(): Promise<CouncilQuestion[]> {
  const { rows } = await tursoExecute(
    "SELECT * FROM questions ORDER BY created_at DESC"
  );
  return rows as unknown as CouncilQuestion[];
}

export async function insertQuestion(q: Omit<CouncilQuestion, "createdAt">): Promise<void> {
  await tursoExecute(
    `INSERT INTO questions (id, title, date, category, question_text, answer_text, ai_summary, status, asked_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [q.id, q.title, q.date, q.category, q.questionText, q.answerText ?? null, q.aiSummary ?? null, q.status ?? "Upućeno", q.askedBy ?? "Dragica Pršo"]
  );
}

// ─── newsletters ──────────────────────────────────────────────────────────────

export async function getSentNewsletters(): Promise<Newsletter[]> {
  const { rows } = await tursoExecute(
    "SELECT * FROM newsletters WHERE status = 'sent' AND resend_broadcast_id IS NOT NULL ORDER BY publish_date DESC LIMIT 20"
  );
  return rows as unknown as Newsletter[];
}

export async function getNewsletterById(id: string): Promise<Newsletter | null> {
  const { rows } = await tursoExecute(
    "SELECT * FROM newsletters WHERE id = ? LIMIT 1",
    [id]
  );
  return (rows[0] as unknown as Newsletter) ?? null;
}

export async function getLatestNewsletterDraft(): Promise<Newsletter | null> {
  const { rows } = await tursoExecute(
    "SELECT * FROM newsletters WHERE status = 'draft' ORDER BY created_at DESC LIMIT 1"
  );
  return (rows[0] as unknown as Newsletter) ?? null;
}

export async function insertNewsletter(n: {
  id: string;
  title: string;
  excerpt: string | null;
  contentHtml: string;
  status?: string;
}): Promise<void> {
  await tursoExecute(
    `INSERT INTO newsletters (id, title, excerpt, content_html, status)
     VALUES (?, ?, ?, ?, ?)`,
    [n.id, n.title, n.excerpt ?? null, n.contentHtml, n.status ?? "draft"]
  );
}

export async function updateNewsletterDraft(id: string, n: { title: string; excerpt: string | null; contentHtml: string }): Promise<void> {
  await tursoExecute(
    "UPDATE newsletters SET title = ?, excerpt = ?, content_html = ?, created_at = datetime('now') WHERE id = ? AND status = 'draft'",
    [n.title, n.excerpt, n.contentHtml, id]
  );
}

export async function markNewsletterSent(
  id: string,
  broadcastId: string,
  publishDate: string
): Promise<void> {
  await tursoExecute(
    "UPDATE newsletters SET status = 'sent', resend_broadcast_id = ?, publish_date = ? WHERE id = ?",
    [broadcastId, publishDate, id]
  );
}

// ─── suggestions ──────────────────────────────────────────────────────────────

export async function getSuggestions(): Promise<Suggestion[]> {
  const { rows } = await tursoExecute(
    "SELECT * FROM suggestions WHERE id NOT LIKE 's_seed_%' ORDER BY created_at DESC LIMIT 50"
  );
  return rows as unknown as Suggestion[];
}

export async function getSuggestionById(id: string): Promise<Suggestion | null> {
  const { rows } = await tursoExecute(
    "SELECT * FROM suggestions WHERE id = ? LIMIT 1",
    [id]
  );
  return (rows[0] as unknown as Suggestion) ?? null;
}

export async function insertSuggestion(s: {
  id: string;
  name: string | null;
  category: string | null;
  text: string;
}): Promise<Suggestion> {
  await tursoExecute(
    "INSERT INTO suggestions (id, name, category, text) VALUES (?, ?, ?, ?)",
    [s.id, s.name ?? null, s.category ?? null, s.text]
  );
  const result = await getSuggestionById(s.id);
  return result ?? ({ ...s, status: "Evidentirano", isDrafted: false, createdAt: new Date().toISOString() } as Suggestion);
}

export { tursoBatch };
