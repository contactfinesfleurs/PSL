import { NextRequest, NextResponse } from "next/server";
import { cleanupExpiredTokens } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    console.error("[GET /api/cron/cleanup-tokens] CRON_SECRET is not configured");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (secret !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await cleanupExpiredTokens();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[GET /api/cron/cleanup-tokens]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
