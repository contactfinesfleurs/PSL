import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseBodyJson, getProfileId, unauthorizedResponse } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";
import { deleteStoredFile } from "@/lib/storage";
import { PLACEMENT_TYPE_VALUES } from "@/lib/constants";

export const dynamic = "force-dynamic";

const PlacementPatchSchema = z.object({
  publication: z.string().min(1).max(200).optional(),
  type: z.enum(PLACEMENT_TYPE_VALUES).optional(),
  publishedAt: z.string().datetime().optional(),
  url: z.string().url().nullable().optional(),
  screenshotPath: z.string().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  reach: z.number().int().positive().nullable().optional(),
  sampleLoanId: z.string().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profileId = getProfileId(req);
    if (!profileId) return unauthorizedResponse();

    const { id } = await params;
    if (!id || typeof id !== "string" || id.trim() === "") {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    // Verify ownership via product.profileId
    const placement = await prisma.mediaPlacement.findFirst({
      where: { id },
      include: { product: { select: { profileId: true } } },
    });
    if (!placement || placement.product.profileId !== profileId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const result = await parseBodyJson(req, PlacementPatchSchema);
    if (!result.success) return result.response;
    const body = result.data;

    const updated = await prisma.mediaPlacement.update({
      where: { id },
      data: {
        ...(body.publication !== undefined && { publication: body.publication }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.publishedAt !== undefined && {
          publishedAt: new Date(body.publishedAt),
        }),
        ...(body.url !== undefined && { url: body.url }),
        ...(body.screenshotPath !== undefined && {
          screenshotPath: body.screenshotPath,
        }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.reach !== undefined && { reach: body.reach }),
        ...(body.sampleLoanId !== undefined && {
          sampleLoanId: body.sampleLoanId,
        }),
      },
    });

    logAudit("PLACEMENT_PATCH", profileId, "mediaPlacement", id, {
      fields: Object.keys(body),
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/placements/[id]]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profileId = getProfileId(req);
    if (!profileId) return unauthorizedResponse();

    const { id } = await params;
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    // Verify ownership via product.profileId
    const placement = await prisma.mediaPlacement.findFirst({
      where: { id },
      include: { product: { select: { profileId: true } } },
    });
    if (!placement || placement.product.profileId !== profileId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (placement.screenshotPath) {
      await deleteStoredFile(placement.screenshotPath);
    }

    await prisma.mediaPlacement.delete({ where: { id } });
    logAudit("PLACEMENT_DELETE", profileId, "mediaPlacement", id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/placements/[id]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
