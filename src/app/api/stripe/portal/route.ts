import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getProfileId, unauthorizedResponse } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (process.env.BETA_MODE === "true") {
    return NextResponse.json(
      { error: "Le portail de facturation n'est pas disponible pendant la période bêta." },
      { status: 503 }
    );
  }

  const profileId = getProfileId(req);
  if (!profileId) return unauthorizedResponse();

  const profile = await prisma.profile.findUniqueOrThrow({
    where: { id: profileId },
  });

  if (!profile.stripeCustomerId) {
    return NextResponse.json(
      { error: "Aucun abonnement actif" },
      { status: 400 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await getStripe().billingPortal.sessions.create({
    customer: profile.stripeCustomerId,
    return_url: `${appUrl}/settings`,
  });

  return NextResponse.json({ url: session.url });
}
