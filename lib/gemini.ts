import { getCloudflareContext } from "@opennextjs/cloudflare";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta";
const MAX_ERROR_CHARS = 1200;
type RuntimeEnv = Record<string, unknown>;

type GeminiPart = { text?: string };
type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
    finishReason?: string;
  }>;
};

function getEnvString(env: RuntimeEnv, key: string): string {
  const value = env[key];
  return typeof value === "string" ? value : "";
}

async function getRuntimeEnv(): Promise<RuntimeEnv> {
  try {
    const { env } = await getCloudflareContext();
    return env as RuntimeEnv;
  } catch {
    return process.env as RuntimeEnv;
  }
}

function getGeminiApiKey(env: RuntimeEnv) {
  return (
    getEnvString(env, "GEMINI_API_KEY") ||
    getEnvString(env, "GOOGLE_GENERATIVE_AI_API_KEY") ||
    getEnvString(env, "GOOGLE_API_KEY")
  );
}

export async function hasGeminiApiKey() {
  return Boolean(getGeminiApiKey(await getRuntimeEnv()));
}

function getGeminiModel(env: RuntimeEnv) {
  return getEnvString(env, "GEMINI_MODEL") || "gemini-3.5-flash";
}

function getGeminiBaseUrl(env: RuntimeEnv) {
  return getEnvString(env, "GEMINI_NATIVE_BASE_URL") || GEMINI_API_URL;
}

export async function callGeminiText(opts: {
  prompt: string;
  system?: string;
  maxOutputTokens?: number;
  temperature?: number;
  json?: boolean;
}): Promise<string> {
  const env = await getRuntimeEnv();
  const apiKey = getGeminiApiKey(env);
  if (!apiKey) throw new Error("GEMINI_API_KEY missing");

  const model = getGeminiModel(env);
  const res = await fetch(`${getGeminiBaseUrl(env)}/models/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      ...(opts.system ? { systemInstruction: { parts: [{ text: opts.system }] } } : {}),
      contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
      generationConfig: {
        maxOutputTokens: opts.maxOutputTokens ?? 2048,
        temperature: opts.temperature ?? 0.45,
        ...(opts.json ? { responseMimeType: "application/json" } : {}),
      },
    }),
  });

  if (!res.ok) {
    const err = (await res.text()).slice(0, MAX_ERROR_CHARS);
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const data = await res.json() as GeminiResponse;
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  return parts.map((part) => part.text ?? "").join("").trim();
}
