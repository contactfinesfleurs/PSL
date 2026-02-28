import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const eventProduct = await prisma.eventProduct.upsert({
    where: {
      eventId_productId: {
        eventId: id,
        productId: body.productId,
      },
    },
    create: {
      eventId: id,
      productId: body.productId,
      notes: body.notes ?? null,
      look: body.look ?? null,
    },
    update: {
      notes: body.notes ?? null,
      look: body.look ?? null,
    },
  });

  return NextResponse.json(eventProduct, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { productId } = await req.json();

  await prisma.eventProduct.delete({
    where: {
      eventId_productId: { eventId: id, productId },
    },
  });

  return NextResponse.json({ success: true });
}
