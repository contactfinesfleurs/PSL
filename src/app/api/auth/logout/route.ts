import { NextResponse } from "next/server";
import { clearSessionCookie, getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const session = await getSession();
    await clearSessionCookie();
    if (session) {
      logAudit("LOGOUT", session.profileId, "profile", session.profileId);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[POST /api/auth/logout]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
