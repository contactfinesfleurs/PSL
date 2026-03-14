import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseBodyJson, getProfileId, unauthorizedResponse } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const JoinSchema = z.object({
  code: z.string().min(1).max(20),
});

// POST /api/projects/join — join a project by code (invitation required)
export async function POST(req: NextRequest) {
  try {
    const profileId = getProfileId(req);
    if (!profileId) return unauthorizedResponse();

    const result = await parseBodyJson(req, JoinSchema);
    if (!result.success) return result.response;
    const { code } = result.data;

    const project = await prisma.project.findUnique({
      where: { code: code.trim().toLowerCase() },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Code projet introuvable. Vérifiez le code et réessayez." },
        { status: 404 }
      );
    }

    // Owner cannot join their own project as collaborator
    if (project.profileId === profileId) {
      return NextResponse.json(
        { error: "Vous êtes déjà propriétaire de ce projet." },
        { status: 409 }
      );
    }

    // Require a valid, non-expired invitation addressed to this user's email
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: { email: true },
    });
    if (!profile) return unauthorizedResponse();

    const invitation = await prisma.projectInvitation.findFirst({
      where: {
        projectId: project.id,
        invitedEmail: profile.email.toLowerCase(),
        status: "PENDING",
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Aucune invitation valide pour rejoindre ce projet." },
        { status: 403 }
      );
    }

    // Accept invitation + create collaborator atomically
    await prisma.$transaction([
      prisma.projectCollaborator.upsert({
        where: { projectId_profileId: { projectId: project.id, profileId } },
        create: { projectId: project.id, profileId },
        update: {},
      }),
      prisma.projectInvitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED", invitedProfileId: profileId },
      }),
    ]);

    logAudit("PROJECT_JOIN", profileId, "project", project.id, { code });

    return NextResponse.json({ success: true, code: project.code, name: project.name });
  } catch (error) {
    console.error("[POST /api/projects/join]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
