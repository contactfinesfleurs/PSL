import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProfileId, unauthorizedResponse } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profileId = getProfileId(req);
  if (!profileId) return unauthorizedResponse();

  const { id } = await params;

  // Verify ownership via product.profileId
  const placement = await prisma.mediaPlacement.findFirst({
    where: { id },
    include: { product: { select: { profileId: true } } },
  });
  if (!placement || placement.product.profileId !== profileId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.mediaPlacement.delete({ where: { id } });
  logAudit("PLACEMENT_DELETE", profileId, "mediaPlacement", id);
  return NextResponse.json({ success: true });
}
