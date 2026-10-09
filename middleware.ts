import { NextResponse, type NextRequest } from "next/server";
import { CANONICAL_HOST, shouldRedirectToCanonicalHost } from "@/lib/canonical-host";

export function middleware(request: NextRequest) {
  if (!shouldRedirectToCanonicalHost(request.headers.get("host"))) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.protocol = "https:";
  url.host = CANONICAL_HOST;
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: "/:path*",
};
