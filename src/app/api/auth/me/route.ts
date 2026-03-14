import { NextResponse } from "next/server";
import { getSession, clearSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    return NextResponse.json({
      profileId: session.profileId,
      name: session.name,
      email: session.email,
    });
  } catch (error) {
    console.error('[GET /api/auth/me]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/auth/me — RGPD right to erasure: permanently delete the account
// and all associated data (cascaded by Prisma schema).
export async function DELETE() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    logAudit("ACCOUNT_DELETE", session.profileId, "profile", session.profileId);

    await prisma.profile.delete({ where: { id: session.profileId } });
    await clearSessionCookie();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/auth/me]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
