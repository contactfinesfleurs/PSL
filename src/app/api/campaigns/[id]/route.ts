import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
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
  { params }: { params: { id: string } }
) {
  const body = await req.json();

  const campaign = await prisma.campaign.update({
    where: { id: params.id },
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

  return NextResponse.json(campaign);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.campaign.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
