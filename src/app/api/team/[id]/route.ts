import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProfileId, unauthorizedResponse } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profileId = getProfileId(req);
  if (!profileId) return unauthorizedResponse();

  const { id } = await params;

  const member = await prisma.teamMember.findUnique({
    where: { id },
  });

  if (!member || member.ownerId !== profileId) {
    return NextResponse.json(
      { error: "Membre non trouvé" },
      { status: 404 }
    );
  }

  await prisma.teamMember.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
