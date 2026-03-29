import { NextResponse } from "next/server";
import { clearSessionCookieOnResponse } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const res = NextResponse.json({ ok: true });
    clearSessionCookieOnResponse(res);
    return res;
  } catch (error) {
    console.error('[POST /api/auth/logout]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
