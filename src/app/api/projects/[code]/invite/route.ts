import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseBodyJson, getProfileId, unauthorizedResponse } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";
import { sendProjectInvitationEmail } from "@/lib/email";
import { getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const MAX_ACTIVE_INVITATIONS = 20;

export const dynamic = "force-dynamic";

const InviteSchema = z.object({
  email: z.string().email(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const ip = getClientIp(req);
    const limited = await rateLimitResponse(ip);
    if (limited) return limited;

    const profileId = getProfileId(req);
    if (!profileId) return unauthorizedResponse();

    const { code } = await params;

    // Load project — owner only
    const project = await prisma.project.findUnique({
      where: { code },
      include: { profile: { select: { id: true, name: true } } },
    });
    if (!project || project.profileId !== profileId) {
      return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
    }

    const result = await parseBodyJson(req, InviteSchema);
    if (!result.success) return result.response;
    const { email } = result.data;

    // Owner cannot invite themselves
    const owner = await prisma.profile.findUnique({ where: { id: profileId } });
    if (owner?.email.toLowerCase() === email.toLowerCase()) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas vous inviter vous-même." },
        { status: 400 }
      );
    }

    // Look up profile by email (might not exist yet)
    const invitedProfile = await prisma.profile.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Already a collaborator?
    if (invitedProfile) {
      const alreadyMember = await prisma.projectCollaborator.findUnique({
        where: {
          projectId_profileId: {
            projectId: project.id,
            profileId: invitedProfile.id,
          },
        },
      });
      if (alreadyMember) {
        return NextResponse.json(
          { error: "Cette personne est déjà collaboratrice du projet." },
          { status: 409 }
        );
      }
    }

    // Enforce max active invitations per project
    const activeCount = await prisma.projectInvitation.count({
      where: { projectId: project.id, status: "PENDING" },
    });
    if (activeCount >= MAX_ACTIVE_INVITATIONS) {
      return NextResponse.json(
        { error: "Ce projet a atteint le nombre maximum d'invitations en attente (20)." },
        { status: 429 }
      );
    }

    // Cooldown: block re-sending to the same email within 24 hours.
    // Since expiresAt is always set to now+30d on (re)send, an existing
    // invitation with expiresAt > now+29d means it was sent less than 24h ago.
    const existing = await prisma.projectInvitation.findUnique({
      where: {
        projectId_invitedEmail: {
          projectId: project.id,
          invitedEmail: email.toLowerCase(),
        },
      },
      select: { expiresAt: true, status: true },
    });
    if (existing?.status === "PENDING" && existing.expiresAt) {
      const cooldownThreshold = new Date(Date.now() + 29 * 24 * 60 * 60 * 1000);
      if (existing.expiresAt > cooldownThreshold) {
        return NextResponse.json(
          { error: "Une invitation a déjà été envoyée à cet email récemment. Réessayez dans 24h." },
          { status: 429 }
        );
      }
    }

    // Invitation expires 30 days from now
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Upsert invitation (idempotent re-send)
    const invitation = await prisma.projectInvitation.upsert({
      where: {
        projectId_invitedEmail: {
          projectId: project.id,
          invitedEmail: email.toLowerCase(),
        },
      },
      create: {
        projectId: project.id,
        invitedByProfileId: profileId,
        invitedEmail: email.toLowerCase(),
        invitedProfileId: invitedProfile?.id ?? null,
        status: "PENDING",
        expiresAt,
      },
      update: {
        status: "PENDING", // re-activate a declined invitation
        invitedProfileId: invitedProfile?.id ?? null,
        expiresAt, // reset expiry on re-send
      },
    });

    logAudit("PROJECT_INVITE", profileId, "project", project.id, { email });

    // Send email (non-blocking — failure does not abort the response)
    // Never use the Origin/Referer header here — it's attacker-controlled and
    // would allow forging invitation links pointing to malicious sites.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://pslstudio.app";

    sendProjectInvitationEmail({
      to: email,
      inviterName: owner?.name ?? "Un utilisateur",
      projectName: project.name,
      projectCode: project.code,
      appUrl,
    }).catch((err) =>
      console.error("[invite] email send failed:", err)
    );

    return NextResponse.json({ success: true, invitationId: invitation.id });
  } catch (error) {
    console.error("[POST /api/projects/[code]/invite]", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
