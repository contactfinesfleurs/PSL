import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProfileId, unauthorizedResponse } from "@/lib/api-helpers";
import { getPlanLimits } from "@/lib/plan-limits";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const profileId = getProfileId(req);
  if (!profileId) return unauthorizedResponse();

  const profile = await prisma.profile.findUniqueOrThrow({
    where: { id: profileId },
    select: { plan: true },
  });

  const [productCount, eventCount, campaignCount, collaboratorCount] =
    await Promise.all([
      prisma.product.count({ where: { profileId, deletedAt: null } }),
      prisma.event.count({ where: { profileId, deletedAt: null } }),
      prisma.campaign.count({ where: { profileId, deletedAt: null } }),
      prisma.teamMember.count({ where: { ownerId: profileId } }),
    ]);

  const limits = getPlanLimits(profile.plan);

  return NextResponse.json({
    plan: profile.plan,
    usage: {
      products: productCount,
      events: eventCount,
      campaigns: campaignCount,
      collaborators: collaboratorCount,
    },
    limits: {
      products: limits.maxProducts,
      events: limits.maxEvents,
      campaigns: limits.maxCampaigns,
      collaborators: limits.maxCollaborators,
    },
  });
}
