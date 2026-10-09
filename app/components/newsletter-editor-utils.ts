import type DOMPurifyType from "dompurify";

let purifier: typeof DOMPurifyType | null = null;

export function sanitizeEditorHtml(html: string): string {
  if (typeof window === "undefined") return html;
  if (!purifier) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    purifier = require("dompurify") as typeof DOMPurifyType;
  }
  return purifier.sanitize(html, { USE_PROFILES: { html: true } });
}

export function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

export function firstImageUrl(html: string) {
  return html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1];
}
