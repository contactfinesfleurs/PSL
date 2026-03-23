import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProfileId, unauthorizedResponse, parseBodyJson } from "@/lib/api-helpers";
import { checkPlanLimit } from "@/lib/plan-guard";
import { z } from "zod";

export const dynamic = "force-dynamic";

const AddMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["VIEWER", "EDITOR"]).default("VIEWER"),
});

export async function GET(req: NextRequest) {
  const profileId = getProfileId(req);
  if (!profileId) return unauthorizedResponse();

  const members = await prisma.teamMember.findMany({
    where: { ownerId: profileId },
    include: {
      member: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: members });
}

export async function POST(req: NextRequest) {
  const profileId = getProfileId(req);
  if (!profileId) return unauthorizedResponse();

  const limitReached = await checkPlanLimit(profileId, "collaborators");
  if (limitReached) return limitReached;

  const result = await parseBodyJson(req, AddMemberSchema);
  if (!result.success) return result.response;
  const { email, role } = result.data;

  const memberProfile = await prisma.profile.findUnique({
    where: { email },
  });

  if (!memberProfile) {
    return NextResponse.json(
      { error: "Aucun compte trouvé avec cet email" },
      { status: 404 }
    );
  }

  if (memberProfile.id === profileId) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas vous ajouter vous-même" },
      { status: 422 }
    );
  }

  const existing = await prisma.teamMember.findUnique({
    where: { ownerId_memberId: { ownerId: profileId, memberId: memberProfile.id } },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Ce collaborateur fait déjà partie de votre équipe" },
      { status: 409 }
    );
  }

  const teamMember = await prisma.teamMember.create({
    data: {
      ownerId: profileId,
      memberId: memberProfile.id,
      role,
    },
    include: {
      member: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(teamMember, { status: 201 });
}
