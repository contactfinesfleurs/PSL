import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseBodyJson, getProfileId, unauthorizedResponse } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";
import { getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const ActionSchema = z.object({
  action: z.enum(["accept", "decline"]),
});

// PATCH /api/projects/invitations/[id]
// The invitee accepts or declines their invitation.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = await rateLimitResponse(`invitations-patch:${getClientIp(req)}`, "moderate");
    if (rl) return rl;

    const profileId = getProfileId(req);
    if (!profileId) return unauthorizedResponse();

    const { id } = await params;

    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: { email: true },
    });
    if (!profile) return unauthorizedResponse();

    // Load invitation — must belong to current user's email
    const invitation = await prisma.projectInvitation.findFirst({
      where: {
        id,
        invitedEmail: profile.email.toLowerCase(),
        status: "PENDING",
      },
      include: { project: { select: { id: true, code: true, name: true } } },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation introuvable." },
        { status: 404 }
      );
    }

    const result = await parseBodyJson(req, ActionSchema);
    if (!result.success) return result.response;
    const { action } = result.data;

    if (action === "accept") {
      // Atomically check expiry + create collaborator + mark accepted (H-5/H-7).
      // The updateMany WHERE includes the expiry condition so that if the
      // invitation expired between the initial read and now, 0 rows are updated
      // and we return 410 — no TOCTOU window.
      const accepted = await prisma.$transaction(async (tx) => {
        const updated = await tx.projectInvitation.updateMany({
          where: {
            id,
            status: "PENDING",
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          data: { status: "ACCEPTED", invitedProfileId: profileId },
        });

        if (updated.count === 0) return false;

        await tx.projectCollaborator.upsert({
          where: { projectId_profileId: { projectId: invitation.project.id, profileId } },
          create: { projectId: invitation.project.id, profileId },
          update: {},
        });

        return true;
      });

      if (!accepted) {
        return NextResponse.json({ error: "Cette invitation a expiré." }, { status: 410 });
      }

      logAudit("PROJECT_INVITE_ACCEPT", profileId, "project", invitation.project.id);
      return NextResponse.json({ success: true, action: "accepted" });
    } else {
      // Decline: also check expiry atomically (H-7)
      const declined = await prisma.projectInvitation.updateMany({
        where: {
          id,
          status: "PENDING",
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        data: { status: "DECLINED", invitedProfileId: profileId },
      });

      if (declined.count === 0) {
        return NextResponse.json({ error: "Cette invitation a expiré." }, { status: 410 });
      }

      logAudit("PROJECT_INVITE_DECLINE", profileId, "project", invitation.project.id);
      return NextResponse.json({ success: true, action: "declined" });
    }
  } catch (error) {
    console.error("[PATCH /api/projects/invitations/[id]]", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
