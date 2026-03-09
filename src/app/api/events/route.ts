import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseBodyJson, validateEnum } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

// ─── Enums (must match Prisma schema comments) ────────────────────────────

// Schema: DRAFT | CONFIRMED | COMPLETED | CANCELLED
const EVENT_STATUSES = ["DRAFT", "CONFIRMED", "COMPLETED", "CANCELLED"] as const;
// Schema: SHOW | PRESENTATION | LAUNCH | PRESS | TRADE-SHOW | OTHER
const EVENT_TYPES = ["SHOW", "PRESENTATION", "LAUNCH", "PRESS", "TRADE-SHOW", "OTHER"] as const;

// ─── Schemas ───────────────────────────────────────────────────────────────

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
  const status = validateEnum(searchParams.get("status"), EVENT_STATUSES);
  const type = validateEnum(searchParams.get("type"), EVENT_TYPES);

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
  const result = await parseBodyJson(req, EventCreateSchema);
  if (!result.success) return result.response;
  const data = result.data;

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
