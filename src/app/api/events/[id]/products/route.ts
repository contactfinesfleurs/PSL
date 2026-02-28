import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();

  const eventProduct = await prisma.eventProduct.upsert({
    where: {
      eventId_productId: {
        eventId: params.id,
        productId: body.productId,
      },
    },
    create: {
      eventId: params.id,
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
  { params }: { params: { id: string } }
) {
  const { productId } = await req.json();

  await prisma.eventProduct.delete({
    where: {
      eventId_productId: { eventId: params.id, productId },
    },
  });

  return NextResponse.json({ success: true });
}
