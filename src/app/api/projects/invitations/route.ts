import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProfileId, unauthorizedResponse } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

// GET /api/projects/invitations
// Returns PENDING invitations addressed to the current user's email.
export async function GET(req: NextRequest) {
  try {
    const profileId = getProfileId(req);
    if (!profileId) return unauthorizedResponse();

    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: { email: true },
    });
    if (!profile) return unauthorizedResponse();

    const invitations = await prisma.projectInvitation.findMany({
      where: {
        invitedEmail: profile.email.toLowerCase(),
        status: "PENDING",
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        project: { select: { id: true, name: true, code: true } },
        invitedByProfile: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(invitations);
  } catch (error) {
    console.error("[GET /api/projects/invitations]", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
