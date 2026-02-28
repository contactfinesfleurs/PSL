import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const type = searchParams.get("type");

  const campaigns = await prisma.campaign.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(type ? { type } : {}),
    },
    include: {
      products: { include: { product: true } },
      event: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(campaigns);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const campaign = await prisma.campaign.create({
    data: {
      name: body.name,
      description: body.description ?? null,
      type: body.type,
      status: body.status ?? "DRAFT",
      startAt: body.startAt ? new Date(body.startAt) : null,
      endAt: body.endAt ? new Date(body.endAt) : null,
      budget: body.budget ?? null,
      currency: body.currency ?? "EUR",
      eventId: body.eventId ?? null,
    },
  });

  return NextResponse.json(campaign, { status: 201 });
}
