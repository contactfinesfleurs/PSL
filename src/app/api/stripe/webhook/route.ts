import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

function getPeriodFromItems(items: Stripe.SubscriptionItem[]) {
  const item = items[0];
  return {
    start: new Date(item.current_period_start * 1000),
    end: new Date(item.current_period_end * 1000),
  };
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const profileId = session.metadata?.profileId;
      if (!profileId || !session.subscription) break;

      const subscription = await getStripe().subscriptions.retrieve(
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription.id
      );

      const period = getPeriodFromItems(subscription.items.data);

      await prisma.$transaction([
        prisma.subscription.upsert({
          where: { profileId },
          create: {
            profileId,
            stripeSubscriptionId: subscription.id,
            stripePriceId: subscription.items.data[0].price.id,
            status: subscription.status,
            currentPeriodStart: period.start,
            currentPeriodEnd: period.end,
          },
          update: {
            stripeSubscriptionId: subscription.id,
            stripePriceId: subscription.items.data[0].price.id,
            status: subscription.status,
            currentPeriodStart: period.start,
            currentPeriodEnd: period.end,
          },
        }),
        prisma.profile.update({
          where: { id: profileId },
          data: { plan: "PRO" },
        }),
      ]);
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const dbSub = await prisma.subscription.findUnique({
        where: { stripeSubscriptionId: sub.id },
      });
      if (!dbSub) break;

      const period = getPeriodFromItems(sub.items.data);
      const isActive = ["active", "trialing"].includes(sub.status);

      await prisma.$transaction([
        prisma.subscription.update({
          where: { id: dbSub.id },
          data: {
            status: sub.status,
            stripePriceId: sub.items.data[0].price.id,
            currentPeriodStart: period.start,
            currentPeriodEnd: period.end,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          },
        }),
        prisma.profile.update({
          where: { id: dbSub.profileId },
          data: { plan: isActive ? "PRO" : "FREE" },
        }),
      ]);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const dbSub = await prisma.subscription.findUnique({
        where: { stripeSubscriptionId: sub.id },
      });
      if (!dbSub) break;

      await prisma.$transaction([
        prisma.subscription.delete({ where: { id: dbSub.id } }),
        prisma.profile.update({
          where: { id: dbSub.profileId },
          data: { plan: "FREE" },
        }),
      ]);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
