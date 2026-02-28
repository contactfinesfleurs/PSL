import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      campaigns: { include: { products: { include: { product: true } } } },
      products: { include: { product: true } },
    },
  });

  if (!event) {
    return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
  }

  return NextResponse.json(event);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const event = await prisma.event.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.type !== undefined && { type: body.type }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.startAt !== undefined && { startAt: new Date(body.startAt) }),
      ...(body.endAt !== undefined && {
        endAt: body.endAt ? new Date(body.endAt) : null,
      }),
      ...(body.location !== undefined && { location: body.location }),
      ...(body.venue !== undefined && { venue: body.venue }),
    },
  });

  return NextResponse.json(event);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.event.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
