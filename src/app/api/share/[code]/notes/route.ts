import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseBodyJson } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";
import { rateLimitResponse, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const NoteSchema = z.object({
  note: z.string().min(1).max(5000),
  authorName: z.string().max(200).optional(),
});

// POST /api/share/[code]/notes — public: external user adds a note
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const ip = getClientIp(req);
    const limited = await rateLimitResponse(ip);
    if (limited) return limited;

    const { code } = await params;

    const share = await prisma.productShare.findUnique({
      where: { code },
      include: { product: true },
    });

    if (!share || !share.product || share.product.deletedAt !== null) {
      return NextResponse.json({ error: "Lien de partage invalide." }, { status: 404 });
    }

    if (share.expiresAt && share.expiresAt < new Date()) {
      return NextResponse.json({ error: "Ce lien de partage a expiré." }, { status: 410 });
    }

    const result = await parseBodyJson(req, NoteSchema);
    if (!result.success) return result.response;
    const body = result.data;

    const contribution = await prisma.shareContribution.create({
      data: {
        shareId: share.id,
        authorName: body.authorName?.trim() || null,
        photoPaths: null,
        note: body.note,
      },
    });

    logAudit("SHARE_CONTRIBUTION_NOTE", share.profileId, "product", share.productId, {
      shareId: share.id,
      contributionId: contribution.id,
    });

    return NextResponse.json({ success: true, id: contribution.id }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/share/[code]/notes]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
