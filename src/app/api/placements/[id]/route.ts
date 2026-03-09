import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProfileId } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const profileId = getProfileId(req);
  await prisma.mediaPlacement.delete({ where: { id } });
  logAudit("PLACEMENT_DELETE", profileId, "mediaPlacement", id);
  return NextResponse.json({ success: true });
}
