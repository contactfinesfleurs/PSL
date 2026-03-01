import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EVENT_TYPES } from "@/lib/utils";

export const dynamic = 'force-dynamic';

const VALID_TYPES = new Set<string>(EVENT_TYPES.map((t) => t.value));
const VALID_STATUSES = new Set<string>(["DRAFT", "CONFIRMED", "COMPLETED", "CANCELLED"]);

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

  if (body.type !== undefined && !VALID_TYPES.has(body.type as string)) {
    return NextResponse.json({ error: "Type invalide" }, { status: 422 });
  }
  if (body.status !== undefined && !VALID_STATUSES.has(body.status as string)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 422 });
  }
  if (body.startAt !== undefined) {
    const d = new Date(body.startAt as string);
    if (isNaN(d.getTime())) {
      return NextResponse.json({ error: "Date de début invalide" }, { status: 422 });
    }
  }

  try {
    const event = await prisma.event.update({
      where: { id },
      data: {
        ...(body.name !== undefined && {
          name: typeof body.name === "string" ? body.name.trim() : String(body.name),
        }),
        ...(body.description !== undefined && {
          description: body.description as string | null,
        }),
        ...(body.type !== undefined && { type: body.type as string }),
        ...(body.status !== undefined && { status: body.status as string }),
        ...(body.startAt !== undefined && { startAt: new Date(body.startAt as string) }),
        ...(body.endAt !== undefined && {
          endAt: body.endAt ? new Date(body.endAt as string) : null,
        }),
        ...(body.location !== undefined && {
          location: body.location as string | null,
        }),
        ...(body.venue !== undefined && { venue: body.venue as string | null }),
      },
    });
    return NextResponse.json(event);
  } catch {
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
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
