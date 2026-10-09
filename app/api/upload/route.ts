import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";

interface R2Bucket {
  put(key: string, value: ArrayBuffer, opts?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
}

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
// SVG excluded — inline SVG can carry executable <script>
const ALLOWED = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nedostaje slika." }, { status: 400 });
  }

  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Podržani su samo JPG, PNG, GIF i WEBP." }, { status: 415 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Slika je prevelika (max 10 MB)." }, { status: 413 });
  }

  try {
    const { env } = await getCloudflareContext();
    const bucket = (env as Record<string, unknown>).IMAGES as R2Bucket | undefined;

    if (!bucket) {
      return NextResponse.json({ error: "R2 bucket nije konfiguriran." }, { status: 503 });
    }

    const ext = file.name.split(".").pop() ?? "jpg";
    const key = `${crypto.randomUUID()}.${ext}`;
    await bucket.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
    });

    const publicUrl = process.env.R2_PUBLIC_URL ?? "";
    return NextResponse.json({ url: `${publicUrl}/${key}` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Prijenos slike nije uspio.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
