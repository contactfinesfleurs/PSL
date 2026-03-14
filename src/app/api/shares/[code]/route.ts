import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProfileId, unauthorizedResponse } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";
import { deleteStoredFile } from "@/lib/storage";
import { safeParseArray } from "@/lib/formatters";

export const dynamic = "force-dynamic";

// DELETE /api/shares/[code] — revoke a share (owner only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const profileId = getProfileId(req);
    if (!profileId) return unauthorizedResponse();

    const { code } = await params;

    const share = await prisma.productShare.findUnique({
      where: { code },
      include: { contributions: { select: { photoPaths: true } } },
    });
    if (!share || share.profileId !== profileId) {
      return NextResponse.json({ error: "Partage introuvable" }, { status: 404 });
    }

    for (const contrib of share.contributions) {
      for (const p of safeParseArray(contrib.photoPaths)) {
        await deleteStoredFile(p);
      }
    }

    await prisma.productShare.delete({ where: { code } });

    logAudit("SHARE_REVOKE", profileId, "product", share.productId, {
      shareId: share.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/shares/[code]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
