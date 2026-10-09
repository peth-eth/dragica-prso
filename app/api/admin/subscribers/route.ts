import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSubscriberDashboard } from "@/lib/resend";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
    const query = searchParams.get("query") ?? "";
    return NextResponse.json(await getSubscriberDashboard(Number.isFinite(page) ? page : 1, query), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Subscriber stats error:", error);
    return NextResponse.json({ error: "Statistika pretplatnika trenutačno nije dostupna." }, { status: 502 });
  }
}
