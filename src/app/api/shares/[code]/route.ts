import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getProfileId, unauthorizedResponse, parseBodyJson } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";
import { deleteStoredFile } from "@/lib/storage";
import { safeParseArray } from "@/lib/formatters";

const SharePatchSchema = z.object({
  label: z.string().max(200).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

export const dynamic = "force-dynamic";

// PATCH /api/shares/[code] — update label or expiry (owner only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const profileId = getProfileId(req);
    if (!profileId) return unauthorizedResponse();

    const { code } = await params;

    const share = await prisma.productShare.findUnique({ where: { code } });
    if (!share || share.profileId !== profileId) {
      return NextResponse.json({ error: "Partage introuvable" }, { status: 404 });
    }

    const result = await parseBodyJson(req, SharePatchSchema);
    if (!result.success) return result.response;
    const body = result.data;

    const updated = await prisma.productShare.update({
      where: { code },
      data: {
        ...(body.label !== undefined && { label: body.label }),
        ...(body.expiresAt !== undefined && {
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        }),
      },
    });

    logAudit("SHARE_UPDATE", profileId, "product", share.productId, {
      shareId: share.id,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/shares/[code]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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

    // Collect all contribution file paths then delete in parallel (Phase 3)
    const allPaths = share.contributions.flatMap((c) => safeParseArray(c.photoPaths));
    await Promise.allSettled(allPaths.map(deleteStoredFile));

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
