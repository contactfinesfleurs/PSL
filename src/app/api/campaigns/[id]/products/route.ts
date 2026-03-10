import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseBodyJson, getProfileId, unauthorizedResponse } from "@/lib/api-helpers";

export const dynamic = 'force-dynamic';

const CampaignProductSchema = z.object({
  productId: z.string().min(1),
  notes: z.string().nullable().optional(),
});

const CampaignProductDeleteSchema = z.object({
  productId: z.string().min(1),
});

export async function POST(
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

    const result = await parseBodyJson(req, CampaignProductSchema);
    if (!result.success) return result.response;
    const body = result.data;

    const cp = await prisma.$transaction(async (tx) => {
      // Verify campaign ownership
      const campaign = await tx.campaign.findFirst({
        where: { id, profileId, deletedAt: null },
      });
      if (!campaign) return null;

      return tx.campaignProduct.upsert({
        where: {
          campaignId_productId: {
            campaignId: id,
            productId: body.productId,
          },
        },
        create: {
          campaignId: id,
          productId: body.productId,
          notes: body.notes ?? null,
        },
        update: {
          notes: body.notes ?? null,
        },
      });
    });

    if (!cp) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(cp, { status: 201 });
  } catch (error) {
    console.error('[POST /api/campaigns/[id]/products]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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

    const result = await parseBodyJson(req, CampaignProductDeleteSchema);
    if (!result.success) return result.response;
    const { productId } = result.data;

    const deleted = await prisma.$transaction(async (tx) => {
      // Verify campaign ownership
      const campaign = await tx.campaign.findFirst({
        where: { id, profileId, deletedAt: null },
      });
      if (!campaign) return null;

      return tx.campaignProduct.delete({
        where: {
          campaignId_productId: { campaignId: id, productId },
        },
      });
    });

    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/campaigns/[id]/products]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
