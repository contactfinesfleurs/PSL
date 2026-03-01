import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  if (!body.productId || typeof body.productId !== "string") {
    return NextResponse.json({ error: "productId requis" }, { status: 422 });
  }

  try {
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
        notes: typeof body.notes === "string" ? body.notes : null,
      },
      update: {
        notes: typeof body.notes === "string" ? body.notes : null,
      },
    });
    return NextResponse.json(cp, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  if (!body.productId || typeof body.productId !== "string") {
    return NextResponse.json({ error: "productId requis" }, { status: 422 });
  }

  try {
    await prisma.campaignProduct.delete({
      where: {
        campaignId_productId: { campaignId: id, productId: body.productId },
      },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
