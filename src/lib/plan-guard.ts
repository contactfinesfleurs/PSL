import { prisma } from "@/lib/prisma";
import { getPlanLimits } from "@/lib/plan-limits";
import { NextResponse } from "next/server";

type Resource = "products" | "events" | "campaigns" | "collaborators";

const RESOURCE_LABELS: Record<Resource, string> = {
  products: "produits",
  events: "événements",
  campaigns: "campagnes",
  collaborators: "collaborateurs",
};

/**
 * Returns a 403 response if the profile has reached its plan limit for the resource.
 * Returns null if the profile is within limits.
 */
export async function checkPlanLimit(
  profileId: string,
  resource: Resource
): Promise<NextResponse | null> {
  const profile = await prisma.profile.findUniqueOrThrow({
    where: { id: profileId },
    select: { plan: true },
  });

  const limits = getPlanLimits(profile.plan);
  const maxKey = `max${resource.charAt(0).toUpperCase() + resource.slice(1)}` as keyof typeof limits;
  const max = limits[maxKey];

  if (max === Infinity) return null;

  let currentCount: number;
  switch (resource) {
    case "products":
      currentCount = await prisma.product.count({ where: { profileId, deletedAt: null } });
      break;
    case "events":
      currentCount = await prisma.event.count({ where: { profileId, deletedAt: null } });
      break;
    case "campaigns":
      currentCount = await prisma.campaign.count({ where: { profileId, deletedAt: null } });
      break;
    case "collaborators":
      currentCount = await prisma.teamMember.count({ where: { ownerId: profileId } });
      break;
  }

  if (currentCount >= max) {
    return NextResponse.json(
      {
        error: `Limite atteinte : ${max} ${RESOURCE_LABELS[resource]} maximum en plan gratuit. Passez au plan Pro pour continuer.`,
        code: "PLAN_LIMIT_REACHED",
        limit: max,
        current: currentCount,
      },
      { status: 403 }
    );
  }

  return null;
}
