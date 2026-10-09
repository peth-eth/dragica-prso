import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const questions = sqliteTable("questions", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  date: text("date").notNull(),
  category: text("category").notNull(),
  questionText: text("question_text").notNull(),
  answerText: text("answer_text"),
  aiSummary: text("ai_summary"),
  status: text("status").notNull().default("Upućeno"),
  askedBy: text("asked_by").notNull().default("Dragica Pršo"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const suggestions = sqliteTable("suggestions", {
  id: text("id").primaryKey(),
  name: text("name"),
  category: text("category"),
  text: text("text").notNull(),
  status: text("status").notNull().default("Evidentirano"),
  isDrafted: integer("is_drafted", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const newsletters = sqliteTable("newsletters", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  excerpt: text("excerpt"),
  contentHtml: text("content_html").notNull(),
  category: text("category"),
  status: text("status").notNull().default("draft"),
  resendBroadcastId: text("resend_broadcast_id"),
  publishDate: text("publish_date"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});
