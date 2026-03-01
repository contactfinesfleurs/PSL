import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EVENT_TYPES, EVENT_STATUSES } from "@/lib/utils";
import { MAX_NAME_LENGTH, MAX_TEXT_LENGTH, isValidDate, isPrismaNotFound } from "@/lib/validation";

export const dynamic = 'force-dynamic';

const VALID_TYPES = new Set<string>(EVENT_TYPES.map((t) => t.value));
const VALID_STATUSES = new Set<string>(EVENT_STATUSES.map((s) => s.value));

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
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
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(
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

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "Nom invalide" }, { status: 422 });
    }
    if (body.name.trim().length > MAX_NAME_LENGTH) {
      return NextResponse.json({ error: `Nom trop long (max ${MAX_NAME_LENGTH} car.)` }, { status: 422 });
    }
  }
  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== "string" || body.description.length > MAX_TEXT_LENGTH) {
      return NextResponse.json({ error: `Description trop longue (max ${MAX_TEXT_LENGTH} car.)` }, { status: 422 });
    }
  }
  if (body.type !== undefined && !VALID_TYPES.has(body.type as string)) {
    return NextResponse.json({ error: "Type invalide" }, { status: 422 });
  }
  if (body.status !== undefined && !VALID_STATUSES.has(body.status as string)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 422 });
  }
  if (body.startAt !== undefined && body.startAt !== null && !isValidDate(body.startAt)) {
    return NextResponse.json({ error: "Date de début invalide" }, { status: 422 });
  }
  if (body.endAt !== undefined && body.endAt !== null && !isValidDate(body.endAt)) {
    return NextResponse.json({ error: "Date de fin invalide" }, { status: 422 });
  }
  if (body.location !== undefined && body.location !== null) {
    if (typeof body.location !== "string" || body.location.length > MAX_NAME_LENGTH) {
      return NextResponse.json({ error: "Lieu trop long" }, { status: 422 });
    }
  }
  if (body.venue !== undefined && body.venue !== null) {
    if (typeof body.venue !== "string" || body.venue.length > MAX_NAME_LENGTH) {
      return NextResponse.json({ error: "Salle trop longue" }, { status: 422 });
    }
  }

  try {
    const event = await prisma.event.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: (body.name as string).trim() }),
        ...(body.description !== undefined && { description: body.description as string | null }),
        ...(body.type !== undefined && { type: body.type as string }),
        ...(body.status !== undefined && { status: body.status as string }),
        ...(body.startAt !== undefined && { startAt: new Date(body.startAt as string) }),
        ...(body.endAt !== undefined && {
          endAt: body.endAt ? new Date(body.endAt as string) : null,
        }),
        ...(body.location !== undefined && { location: body.location as string | null }),
        ...(body.venue !== undefined && { venue: body.venue as string | null }),
      },
    });
    return NextResponse.json(event);
  } catch (err) {
    if (isPrismaNotFound(err)) {
      return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.event.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (isPrismaNotFound(err)) {
      return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
