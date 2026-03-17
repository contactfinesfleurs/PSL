import { NextRequest, NextResponse } from "next/server";
import { getStripe, STRIPE_PRICES } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getProfileId, unauthorizedResponse } from "@/lib/api-helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CheckoutSchema = z.object({
  plan: z.enum(["monthly", "yearly"]),
});

export async function POST(req: NextRequest) {
  const profileId = getProfileId(req);
  if (!profileId) return unauthorizedResponse();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const parsed = CheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Plan invalide" }, { status: 422 });
  }

  const priceId =
    parsed.data.plan === "yearly"
      ? STRIPE_PRICES.PRO_YEARLY
      : STRIPE_PRICES.PRO_MONTHLY;

  const profile = await prisma.profile.findUniqueOrThrow({
    where: { id: profileId },
  });

  // Get or create Stripe customer
  let customerId = profile.stripeCustomerId;
  if (!customerId) {
    const customer = await getStripe().customers.create({
      email: profile.email,
      name: profile.name,
      metadata: { profileId },
    });
    customerId = customer.id;
    await prisma.profile.update({
      where: { id: profileId },
      data: { stripeCustomerId: customerId },
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/?upgraded=true`,
    cancel_url: `${appUrl}/settings`,
    metadata: { profileId },
  });

  return NextResponse.json({ url: session.url });
}
