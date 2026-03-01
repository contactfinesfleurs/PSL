import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EVENT_TYPES, EVENT_STATUSES } from "@/lib/utils";
import { MAX_NAME_LENGTH, MAX_TEXT_LENGTH, isJsonObject, isValidDate } from "@/lib/validation";

export const dynamic = 'force-dynamic';

const VALID_TYPES = new Set<string>(EVENT_TYPES.map((t) => t.value));
const VALID_STATUSES = new Set<string>(EVENT_STATUSES.map((s) => s.value));

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const type = searchParams.get("type");

  try {
    const events = await prisma.event.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(type ? { type } : {}),
      },
      include: {
        campaigns: true,
        products: { include: { product: true } },
      },
      orderBy: { startAt: "asc" },
    });
    return NextResponse.json(events);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    const raw: unknown = await req.json();
    if (!isJsonObject(raw)) return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
    body = raw;
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "Nom requis" }, { status: 422 });
  }
  if (body.name.trim().length > MAX_NAME_LENGTH) {
    return NextResponse.json({ error: `Nom trop long (max ${MAX_NAME_LENGTH} car.)` }, { status: 422 });
  }
  if (!body.type || typeof body.type !== "string" || !VALID_TYPES.has(body.type)) {
    return NextResponse.json({ error: "Type invalide" }, { status: 422 });
  }
  if (body.status !== undefined && (typeof body.status !== "string" || !VALID_STATUSES.has(body.status))) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 422 });
  }
  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== "string" || body.description.length > MAX_TEXT_LENGTH) {
      return NextResponse.json({ error: `Description trop longue (max ${MAX_TEXT_LENGTH} car.)` }, { status: 422 });
    }
  }
  if (!body.startAt || !isValidDate(body.startAt)) {
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
    const event = await prisma.event.create({
      data: {
        name: (body.name as string).trim(),
        description: typeof body.description === "string" ? body.description : null,
        type: body.type as string,
        status: (body.status as string | undefined) ?? "DRAFT",
        startAt: new Date(body.startAt as string),
        endAt: body.endAt ? new Date(body.endAt as string) : null,
        location: typeof body.location === "string" ? body.location : null,
        venue: typeof body.venue === "string" ? body.venue : null,
      },
    });
    return NextResponse.json(event, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
