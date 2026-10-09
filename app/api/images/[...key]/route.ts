import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

interface R2Bucket {
  get(key: string): Promise<{ body: ReadableStream; httpMetadata?: { contentType?: string } } | null>;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key } = await params;
  const objectKey = key.join("/");

  try {
    const { env } = await getCloudflareContext();
    const bucket = (env as Record<string, unknown>).IMAGES as R2Bucket | undefined;

    if (!bucket) {
      return new NextResponse("R2 not configured", { status: 503 });
    }

    const object = await bucket.get(objectKey);
    if (!object) {
      return new NextResponse("Not found", { status: 404 });
    }

    // Allowlist only safe image types — never echo back arbitrary stored Content-Type.
    // text/html or image/svg+xml served same-origin would let stored XSS reach the admin cookie.
    const SAFE = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
    const stored = object.httpMetadata?.contentType ?? "";
    const contentType = SAFE.has(stored) ? stored : "application/octet-stream";

    return new NextResponse(object.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      },
    });
  } catch {
    return new NextResponse("Error", { status: 500 });
  }
}
