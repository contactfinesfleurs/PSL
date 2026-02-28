import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const cp = await prisma.campaignProduct.upsert({
    where: {
      campaignId_productId: {
        campaignId: id,
        productId: body.productId,
      },
    },
    create: {
      campaignId: id,
      productId: body.productId,
      notes: body.notes ?? null,
    },
    update: {
      notes: body.notes ?? null,
    },
  });

  return NextResponse.json(cp, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { productId } = await req.json();

  await prisma.campaignProduct.delete({
    where: {
      campaignId_productId: { campaignId: id, productId },
    },
  });

  return NextResponse.json({ success: true });
}
