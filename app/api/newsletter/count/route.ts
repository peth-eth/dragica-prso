import { NextResponse } from "next/server";
import { getSubscriberCount } from "@/lib/resend";

export const revalidate = 300; // 5-min cache

export async function GET() {
  try {
    const total = await getSubscriberCount();
    return NextResponse.json({ total });
  } catch {
    return NextResponse.json({ total: 0 });
  }
}
