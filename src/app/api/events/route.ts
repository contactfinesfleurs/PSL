import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

// ─── Validation schemas ────────────────────────────────────────────────────

const EVENT_STATUSES = ["DRAFT", "CONFIRMED", "CANCELLED", "COMPLETED"] as const;
const EVENT_TYPES = ["SHOW", "PRESENTATION", "LAUNCH", "PRESS", "TRADE_SHOW"] as const;

const EventCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  type: z.enum(EVENT_TYPES),
  status: z.enum(EVENT_STATUSES).default("DRAFT"),
  startAt: z.string().datetime(),
  endAt: z.string().datetime().optional().nullable(),
  location: z.string().max(500).optional().nullable(),
  venue: z.string().max(300).optional().nullable(),
});

// ─── Handlers ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawStatus = searchParams.get("status");
  const rawType = searchParams.get("type");

  // Validate enum query params — reject unknown values instead of unsafe cast
  const status =
    rawStatus && (EVENT_STATUSES as readonly string[]).includes(rawStatus)
      ? (rawStatus as (typeof EVENT_STATUSES)[number])
      : undefined;
  const type =
    rawType && (EVENT_TYPES as readonly string[]).includes(rawType)
      ? (rawType as (typeof EVENT_TYPES)[number])
      : undefined;

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
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête JSON invalide." }, { status: 400 });
  }

  const parsed = EventCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides.", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const data = parsed.data;

  const event = await prisma.event.create({
    data: {
      name: data.name,
      description: data.description ?? null,
      type: data.type,
      status: data.status,
      startAt: new Date(data.startAt),
      endAt: data.endAt ? new Date(data.endAt) : null,
      location: data.location ?? null,
      venue: data.venue ?? null,
    },
  });

  return NextResponse.json(event, { status: 201 });
}
