import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseBodyJson, getProfileId, unauthorizedResponse } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

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
      // Create collaborator entry + mark invitation accepted (in a transaction)
      await prisma.$transaction([
        prisma.projectCollaborator.upsert({
          where: {
            projectId_profileId: {
              projectId: invitation.project.id,
              profileId,
            },
          },
          create: { projectId: invitation.project.id, profileId },
          update: {},
        }),
        prisma.projectInvitation.update({
          where: { id },
          data: { status: "ACCEPTED", invitedProfileId: profileId },
        }),
      ]);
      logAudit("PROJECT_INVITE_ACCEPT", profileId, "project", invitation.project.id);
      return NextResponse.json({ success: true, action: "accepted" });
    } else {
      await prisma.projectInvitation.update({
        where: { id },
        data: { status: "DECLINED", invitedProfileId: profileId },
      });
      logAudit("PROJECT_INVITE_DECLINE", profileId, "project", invitation.project.id);
      return NextResponse.json({ success: true, action: "declined" });
    }
  } catch (error) {
    console.error("[PATCH /api/projects/invitations/[id]]", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
