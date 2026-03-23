import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseBodyJson, validateEnum, getProfileId, unauthorizedResponse, parsePagination } from "@/lib/api-helpers";
import { EVENT_STATUS_VALUES, EVENT_TYPE_VALUES } from "@/lib/constants";
import { checkPlanLimit } from "@/lib/plan-guard";

export const dynamic = "force-dynamic";

const EventCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  type: z.enum(EVENT_TYPE_VALUES),
  status: z.enum(EVENT_STATUS_VALUES).default("DRAFT"),
  startAt: z.string().datetime(),
  endAt: z.string().datetime().optional().nullable(),
  location: z.string().max(500).optional().nullable(),
  venue: z.string().max(300).optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const profileId = getProfileId(req);
    if (!profileId) return unauthorizedResponse();

    const { searchParams } = new URL(req.url);
    const status = validateEnum(searchParams.get("status"), EVENT_STATUS_VALUES);
    const type = validateEnum(searchParams.get("type"), EVENT_TYPE_VALUES);
    const { skip, take, page, limit } = parsePagination(searchParams);

    const where = {
      profileId,
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
    };

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        // Only include lightweight counts/ids needed for list display.
        // Deep relations (campaigns, products) are loaded on the detail route to avoid N+1.
        include: {
          _count: { select: { campaigns: true, products: true } },
        },
        orderBy: { startAt: "asc" },
        skip,
        take,
      }),
      prisma.event.count({ where }),
    ]);

    return NextResponse.json({
      data: events,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[GET /api/events]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const profileId = getProfileId(req);
    if (!profileId) return unauthorizedResponse();

    const limitReached = await checkPlanLimit(profileId, "events");
    if (limitReached) return limitReached;

    const result = await parseBodyJson(req, EventCreateSchema);
    if (!result.success) return result.response;
    const data = result.data;

    const event = await prisma.event.create({
      data: {
        profileId,
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
  } catch (error) {
    console.error('[POST /api/events]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
