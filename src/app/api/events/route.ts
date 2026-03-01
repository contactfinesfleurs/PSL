import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EVENT_TYPES } from "@/lib/utils";

export const dynamic = 'force-dynamic';

const VALID_TYPES = new Set<string>(EVENT_TYPES.map((t) => t.value));
const VALID_STATUSES = new Set<string>(["DRAFT", "CONFIRMED", "COMPLETED", "CANCELLED"]);

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
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "Nom requis" }, { status: 422 });
  }
  if (!body.type || !VALID_TYPES.has(body.type as string)) {
    return NextResponse.json({ error: "Type invalide" }, { status: 422 });
  }
  if (body.status !== undefined && !VALID_STATUSES.has(body.status as string)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 422 });
  }
  if (!body.startAt) {
    return NextResponse.json({ error: "Date de début requise" }, { status: 422 });
  }
  const startAt = new Date(body.startAt as string);
  if (isNaN(startAt.getTime())) {
    return NextResponse.json({ error: "Date de début invalide" }, { status: 422 });
  }

  try {
    const event = await prisma.event.create({
      data: {
        name: (body.name as string).trim(),
        description: typeof body.description === "string" ? body.description : null,
        type: body.type as string,
        status: (body.status as string | undefined) ?? "DRAFT",
        startAt,
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
