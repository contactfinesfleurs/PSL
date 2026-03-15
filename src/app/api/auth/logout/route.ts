import { NextResponse } from "next/server";
import { clearSessionCookie, getSession, revokeToken } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const session = await getSession();

    if (session) {
      // Revoke the JWT by its jti so it cannot be reused even if stolen
      if (session.jti && session.exp) {
        await revokeToken(session.jti, new Date(session.exp * 1000));
      }
      logAudit("LOGOUT", session.profileId, "profile", session.profileId);
    }

    await clearSessionCookie();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[POST /api/auth/logout]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
