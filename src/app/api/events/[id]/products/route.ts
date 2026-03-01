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
        notes: typeof body.notes === "string" ? body.notes : null,
        look: typeof body.look === "number" ? body.look : null,
      },
      update: {
        notes: typeof body.notes === "string" ? body.notes : null,
        look: typeof body.look === "number" ? body.look : null,
      },
    });
    return NextResponse.json(eventProduct, { status: 201 });
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
    await prisma.eventProduct.delete({
      where: {
        eventId_productId: { eventId: id, productId: body.productId },
      },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
