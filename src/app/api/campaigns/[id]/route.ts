import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseBodyJson, getProfileId, unauthorizedResponse } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const CampaignPatchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  type: z.enum(["DIGITAL", "PRINT", "OOH", "SOCIAL", "INFLUENCER", "OTHER"]).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"]).optional(),
  startAt: z.string().datetime().nullable().optional(),
  endAt: z.string().datetime().nullable().optional(),
  budget: z.number().positive().nullable().optional(),
  currency: z.string().length(3).optional(),
  eventId: z.string().nullable().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profileId = getProfileId(req);
  if (!profileId) return unauthorizedResponse();

  const { id } = await params;
  const campaign = await prisma.campaign.findUnique({
    where: { id, profileId, deletedAt: null },
    include: {
      products: { include: { product: true } },
      event: true,
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campagne introuvable" }, { status: 404 });
  }

  return NextResponse.json(campaign);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profileId = getProfileId(req);
  if (!profileId) return unauthorizedResponse();

  const { id } = await params;

  const existing = await prisma.campaign.findUnique({ where: { id, profileId, deletedAt: null } });
  if (!existing) {
    return NextResponse.json({ error: "Campagne introuvable" }, { status: 404 });
  }

  const result = await parseBodyJson(req, CampaignPatchSchema);
  if (!result.success) return result.response;
  const body = result.data;

  const campaign = await prisma.campaign.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.type !== undefined && { type: body.type }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.startAt !== undefined && {
        startAt: body.startAt ? new Date(body.startAt) : null,
      }),
      ...(body.endAt !== undefined && {
        endAt: body.endAt ? new Date(body.endAt) : null,
      }),
      ...(body.budget !== undefined && { budget: body.budget }),
      ...(body.currency !== undefined && { currency: body.currency }),
      ...(body.eventId !== undefined && { eventId: body.eventId }),
    },
  });

  logAudit("CAMPAIGN_PATCH", profileId, "campaign", id, { fields: Object.keys(body) });

  return NextResponse.json(campaign);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profileId = getProfileId(req);
  if (!profileId) return unauthorizedResponse();

  const { id } = await params;

  const existing = await prisma.campaign.findUnique({ where: { id, profileId, deletedAt: null } });
  if (!existing) {
    return NextResponse.json({ error: "Campagne introuvable" }, { status: 404 });
  }

  await prisma.campaign.update({ where: { id }, data: { deletedAt: new Date() } });
  logAudit("CAMPAIGN_DELETE", profileId, "campaign", id);
  return NextResponse.json({ success: true });
}
