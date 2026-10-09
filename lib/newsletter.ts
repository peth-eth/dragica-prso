import { callGeminiText, hasGeminiApiKey } from "./gemini";
import { sanitizeNewsletterHtml } from "./sanitize";

export { sanitizeNewsletterHtml };

export type NewsletterTone = "warm" | "formal" | "sharp";

export type NewsletterDraft = {
  titleOptions: string[];
  subtitleOptions: string[];
  hookOptions: string[];
  selectedTitle: string;
  selectedSubtitle: string;
  selectedHook: string;
  excerpt: string;
  html: string;
};

export type NewsletterGenerationResult = {
  draft: NewsletterDraft;
  source: "gemini" | "fallback";
  reason?: "missing-key" | "provider-error" | "unusable-output";
};

// Fixed editorial voice: warm toward citizens, critical toward city hall.
const FIXED_TONE =
  "topao, blizak i s razumijevanjem prema građanima, ali jasan, kritičan i oštar prema gradskoj vlasti kada je to opravdano";

const MIN_LONG_SOURCE_WORDS = 60;
const MIN_AI_WORDS_FOR_LONG_SOURCE = 45;

// Strip Facebook paste noise: the obfuscated reaction-count gibberish
// (e.g. "poestrnSod1c 1 0f e 5 u 931ci2 t h801"), the "·" separators,
// and a leading author-name/timestamp header line.
export function cleanSource(raw: string): string {
  return raw
    .replace(/·/g, " ")
    // runs of 4+ single/double-char tokens = scrambled reaction counters
    .replace(/(?:\b[\w\d]{1,2}\b[ \t]+){4,}[\w\d]{0,2}/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Pull out the object if the provider wraps JSON in prose.
function extractJson(text: string): string {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : text;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function wordCount(value: string) {
  return value.match(/\p{L}[\p{L}\p{M}\d'-]*/gu)?.length ?? 0;
}

function htmlToText(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function paragraphize(clean: string) {
  const blocks = clean
    .split(/\n{2,}/)
    .flatMap((block) => {
      const trimmed = block.trim();
      if (wordCount(trimmed) <= 90) return [trimmed];
      return trimmed
        .split(/(?<=[.!?])\s+(?=[A-ZČĆĐŠŽ0-9])/)
        .reduce<string[]>((acc, sentence) => {
          const last = acc.at(-1);
          if (!last || wordCount(last) > 60) acc.push(sentence);
          else acc[acc.length - 1] = `${last} ${sentence}`;
          return acc;
        }, []);
    })
    .map((line) => line.trim())
    .filter(Boolean);

  return blocks.length > 0 ? blocks.slice(0, 12) : [clean];
}

export function renderFallback(rawText: string): NewsletterDraft {
  const clean = cleanSource(rawText);
  const items = paragraphize(clean);
  const body = items.map((item) => `<p>${escapeHtml(item)}</p>`).join("\n");

  const title = "Tjedni glasnik vijećnice Dragice Pršo";
  const subtitle = "Pregled najvažnijih tema, pitanja i idućih koraka za građane Pule.";
  const hook = items[0]?.slice(0, 200) ?? subtitle;

  return {
    titleOptions: [title],
    subtitleOptions: [subtitle],
    hookOptions: [hook],
    selectedTitle: title,
    selectedSubtitle: subtitle,
    selectedHook: hook,
    excerpt: subtitle,
    html: body,
  };
}

function asStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const items = value.map((item) => String(item ?? "").trim()).filter(Boolean);
  return items.length > 0 ? items.slice(0, 3) : fallback;
}

function sanitizeDraft(raw: unknown, cleanedSource: string): NewsletterGenerationResult {
  const fallback = renderFallback(cleanedSource);
  if (!raw || typeof raw !== "object") {
    return { draft: fallback, source: "fallback", reason: "unusable-output" };
  }
  const value = raw as Partial<Record<keyof NewsletterDraft, unknown>>;

  const titleOptions = asStringArray(value.titleOptions, fallback.titleOptions);
  const subtitleOptions = asStringArray(value.subtitleOptions, fallback.subtitleOptions);
  const hookOptions = asStringArray(value.hookOptions, fallback.hookOptions);
  const html = sanitizeNewsletterHtml(String(value.html ?? ""));

  const draft: NewsletterDraft = {
    titleOptions,
    subtitleOptions,
    hookOptions,
    selectedTitle: String(value.selectedTitle ?? titleOptions[0] ?? fallback.selectedTitle).trim(),
    selectedSubtitle: String(value.selectedSubtitle ?? subtitleOptions[0] ?? fallback.selectedSubtitle).trim(),
    selectedHook: String(value.selectedHook ?? hookOptions[0] ?? fallback.selectedHook).trim(),
    excerpt: String(value.excerpt ?? fallback.excerpt).trim(),
    html,
  };

  return isUsableNewsletterDraft(draft, cleanedSource)
    ? { draft, source: "gemini" }
    : { draft: fallback, source: "fallback", reason: "unusable-output" };
}

export function isUsableNewsletterDraft(draft: NewsletterDraft, cleanedSource: string) {
  const sourceWords = wordCount(cleanedSource);
  const htmlWords = wordCount(htmlToText(draft.html));
  const blockCount = (draft.html.match(/<(p|h2|h3|li|blockquote)\b/gi) ?? []).length;

  if (!draft.selectedTitle || !draft.selectedHook || !draft.html.trim()) return false;
  if (blockCount < 2 && sourceWords >= 30) return false;
  if (sourceWords >= MIN_LONG_SOURCE_WORDS && htmlWords < MIN_AI_WORDS_FOR_LONG_SOURCE) return false;
  if (sourceWords >= MIN_LONG_SOURCE_WORDS && htmlWords < Math.floor(sourceWords * 0.25)) return false;
  return true;
}

export async function generateNewsletterResult(rawText: string): Promise<NewsletterGenerationResult> {
  const cleaned = cleanSource(rawText);
  if (!(await hasGeminiApiKey())) {
    return { draft: renderFallback(cleaned), source: "fallback", reason: "missing-key" };
  }

  const prompt = `Ti si urednik tjednog glasnika nezavisne gradske vijećnice Dragice Pršo iz Pule. Pišeš u prvom licu, kao Dragica.

TON (uvijek): ${FIXED_TONE}.

Izvor je zalijepljen s Facebooka i sadrži SMEĆE koje MORAŠ potpuno ignorirati: ime i vrijeme objave, brojeve i ikone reakcija, izmiješane besmislene znakove (npr. "poestrnSod1c 1 0f e 5 u 931ci2"), oznake "·". Izvuci ISKLJUČIVO stvarni sadržaj poruke.

Zadatak:
- Uredno preoblikuj CIJELI stvarni sadržaj u jasne, kratke odlomke (<p>) i, gdje ima smisla, podnaslove (<h2>). Nikad jedan veliki blok teksta.
- Ne sažimaj u par riječi. Za dulji izvor napiši najmanje 4 puna odlomka i sačuvaj sve bitne tvrdnje, brojke, lokacije, imena i zahtjeve.
- HTML mora biti stvarni članak/glasnik, ne popis naslova i ne jedna riječ po retku.
- Napiši 3 NASLOVA, 3 PODNASLOVA i 3 HOOK-a (uvodna odlomka).
- HOOK mora biti KONKRETAN i vezan upravo uz OVAJ sadržaj (spomeni stvarnu temu) — NIKAD općenita fraza poput "donosim sažetak tema ovog tjedna".
- Sve na hrvatskom jeziku.

Izvor:
"""
${cleaned.slice(0, 6000)}
"""

Odgovori ISKLJUČIVO JSON-om (bez Markdown omotača), točno ovog oblika:
{
  "titleOptions": ["naslov 1","naslov 2","naslov 3"],
  "subtitleOptions": ["podnaslov 1","podnaslov 2","podnaslov 3"],
  "hookOptions": ["uvod 1","uvod 2","uvod 3"],
  "selectedTitle": "preporučeni naslov",
  "selectedSubtitle": "preporučeni podnaslov",
  "selectedHook": "preporučeni uvodni odlomak",
  "excerpt": "kratki sažetak do 160 znakova",
  "html": "<h2>Naslov sekcije</h2><p>...</p><p>...</p>"
}`;

  try {
    const text = await callGeminiText({
      prompt,
      json: true,
      maxOutputTokens: 4096,
      temperature: 0.35,
    });
    const parsed = JSON.parse(extractJson(text)) as unknown;
    return sanitizeDraft(parsed, cleaned);
  } catch {
    return { draft: renderFallback(cleaned), source: "fallback", reason: "provider-error" };
  }
}

export async function generateNewsletter(rawText: string): Promise<NewsletterDraft> {
  return (await generateNewsletterResult(rawText)).draft;
}

export async function draftQuestion(opts: {
  name: string;
  category: string;
  text: string;
}): Promise<{ suggestedTitle: string; draftedText: string }> {
  const fallback = {
    suggestedTitle: `Vijećničko pitanje: ${opts.category || "Prijedlog građana"}`,
    draftedText: `Poštovani gradonačelniče,\n\nU ime građana Pule, potaknuta prijedlogom sugrađanina ${opts.name || "sugrađanina"}, postavljam pitanje vezano uz: "${opts.text}".\n\nKada se planira rješavanje?\n\nS poštovanjem,\nDragica Pršo, nezavisna vijećnica.`,
  };

  if (!hasGeminiApiKey()) return fallback;

  const prompt = `Ti si savjetnik nezavisne vijećnice Dragice Pršo u Puli. Pretoči prijedlog građanina u formalno vijećničko pitanje.

Kategorija: ${opts.category}
Građanin: ${opts.name}
Prijedlog: "${opts.text.slice(0, 1000)}"

Odgovori isključivo JSON-om:
{
  "suggestedTitle": "kratak naslov pitanja",
  "draftedText": "formalni tekst pitanja počevši s 'Poštovani gradonačelniče,...'"
}`;

  try {
    const text = await callGeminiText({ prompt, json: true, maxOutputTokens: 1200, temperature: 0.3 });
    return JSON.parse(extractJson(text)) as { suggestedTitle: string; draftedText: string };
  } catch {
    return fallback;
  }
}

export async function analyzeQuestion(opts: {
  title: string;
  questionText: string;
  answerText?: string;
}): Promise<string> {
  const fallback = "Dragica traži potpunu transparentnost i konkretno rješavanje ovog pitanja za dobro građana Pule.";

  if (!hasGeminiApiKey()) return fallback;

  const prompt = `Sažmi ovo vijećničko pitanje u 2-3 rečenice jednostavnim jezikom za građane Pule.

Naslov: ${opts.title}
Pitanje: ${opts.questionText.slice(0, 800)}
Odgovor: ${(opts.answerText ?? "Čeka se odgovor...").slice(0, 400)}

Napiši samo tekst sažetka, bez uvoda.`;

  try {
    return await callGeminiText({ prompt, maxOutputTokens: 360, temperature: 0.35 });
  } catch {
    return fallback;
  }
}
