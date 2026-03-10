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
  const profileId = getProfileId(req);
  if (!profileId) return unauthorizedResponse();

  const { id } = await params;

  // Verify campaign ownership
  const campaign = await prisma.campaign.findFirst({
    where: { id, profileId, deletedAt: null },
  });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await parseBodyJson(req, CampaignProductSchema);
  if (!result.success) return result.response;
  const body = result.data;

  const cp = await prisma.campaignProduct.upsert({
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

  return NextResponse.json(cp, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profileId = getProfileId(req);
  if (!profileId) return unauthorizedResponse();

  const { id } = await params;

  // Verify campaign ownership
  const campaign = await prisma.campaign.findFirst({
    where: { id, profileId, deletedAt: null },
  });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await parseBodyJson(req, CampaignProductDeleteSchema);
  if (!result.success) return result.response;
  const { productId } = result.data;

  await prisma.campaignProduct.delete({
    where: {
      campaignId_productId: { campaignId: id, productId },
    },
  });

  return NextResponse.json({ success: true });
}
