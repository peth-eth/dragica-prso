import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function verifyTurnstile(token: string, ip?: string): Promise<boolean> {
  const { env } = await getCloudflareContext();
  const configuredSecret = (env as Record<string, unknown>).TURNSTILE_SECRET_KEY;
  const secret = typeof configuredSecret === "string" ? configuredSecret : process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return process.env.NODE_ENV !== "production";

  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.append("remoteip", ip);

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });
  const data = await res.json() as { success?: boolean };
  return data.success === true;
}
