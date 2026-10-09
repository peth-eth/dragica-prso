import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

export async function GET() {
  const { env } = await getCloudflareContext();
  const siteKey = (env as Record<string, unknown>).TURNSTILE_SITE_KEY;

  return NextResponse.json(
    { siteKey: typeof siteKey === "string" ? siteKey : "" },
    { headers: { "Cache-Control": "no-store" } }
  );
}
