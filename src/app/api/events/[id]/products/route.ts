import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MAX_NOTES_LENGTH, isJsonObject, isPrismaNotFound, isPrismaFKViolation } from "@/lib/validation";

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    const raw: unknown = await req.json();
    if (!isJsonObject(raw)) return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
    body = raw;
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  if (!body.productId || typeof body.productId !== "string") {
    return NextResponse.json({ error: "productId requis" }, { status: 422 });
  }
  if (body.notes !== undefined && body.notes !== null) {
    if (typeof body.notes !== "string" || body.notes.length > MAX_NOTES_LENGTH) {
      return NextResponse.json({ error: `Notes trop longues (max ${MAX_NOTES_LENGTH} car.)` }, { status: 422 });
    }
  }
  if (body.look !== undefined && body.look !== null) {
    if (typeof body.look !== "number" || !Number.isInteger(body.look) || body.look < 0) {
      return NextResponse.json({ error: "Numéro de look invalide" }, { status: 422 });
    }
  }

  try {
    const eventProduct = await prisma.eventProduct.upsert({
      where: { eventId_productId: { eventId: id, productId: body.productId } },
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
  } catch (err) {
    if (isPrismaFKViolation(err)) {
      return NextResponse.json({ error: "Événement ou produit introuvable" }, { status: 404 });
    }
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
    const raw: unknown = await req.json();
    if (!isJsonObject(raw)) return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
    body = raw;
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  if (!body.productId || typeof body.productId !== "string") {
    return NextResponse.json({ error: "productId requis" }, { status: 422 });
  }

  try {
    await prisma.eventProduct.delete({
      where: { eventId_productId: { eventId: id, productId: body.productId } },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (isPrismaNotFound(err)) {
      return NextResponse.json({ error: "Association introuvable" }, { status: 404 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
