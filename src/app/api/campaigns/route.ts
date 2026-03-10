import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseBodyJson, validateEnum, getProfileId, unauthorizedResponse, parsePagination } from "@/lib/api-helpers";
import { CAMPAIGN_STATUS_VALUES, CAMPAIGN_TYPE_VALUES } from "@/lib/constants";

export const dynamic = "force-dynamic";

const CampaignCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  type: z.enum(CAMPAIGN_TYPE_VALUES),
  status: z.enum(CAMPAIGN_STATUS_VALUES).default("DRAFT"),
  startAt: z.string().datetime().optional().nullable(),
  endAt: z.string().datetime().optional().nullable(),
  budget: z.number().positive().optional().nullable(),
  currency: z.string().length(3).default("EUR"),
  eventId: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const profileId = getProfileId(req);
    if (!profileId) return unauthorizedResponse();

    const { searchParams } = new URL(req.url);
    const status = validateEnum(searchParams.get("status"), CAMPAIGN_STATUS_VALUES);
    const type = validateEnum(searchParams.get("type"), CAMPAIGN_TYPE_VALUES);
    const { skip, take, page, limit } = parsePagination(searchParams);

    const where = {
      profileId,
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
    };

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        // Only include lightweight relations needed for list display.
        // Deep relations (products detail) are loaded on the detail route to avoid N+1.
        include: {
          event: { select: { id: true, name: true, type: true, status: true, startAt: true } },
          _count: { select: { products: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.campaign.count({ where }),
    ]);

    return NextResponse.json({
      data: campaigns,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[GET /api/campaigns]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const profileId = getProfileId(req);
    if (!profileId) return unauthorizedResponse();

    const result = await parseBodyJson(req, CampaignCreateSchema);
    if (!result.success) return result.response;
    const data = result.data;

    // Verify the referenced event belongs to the same profile (prevents cross-tenant linking)
    if (data.eventId) {
      const event = await prisma.event.findFirst({
        where: { id: data.eventId, profileId, deletedAt: null },
      });
      if (!event) return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
    }

    const campaign = await prisma.campaign.create({
      data: {
        profileId,
        name: data.name,
        description: data.description ?? null,
        type: data.type,
        status: data.status,
        startAt: data.startAt ? new Date(data.startAt) : null,
        endAt: data.endAt ? new Date(data.endAt) : null,
        budget: data.budget ?? null,
        currency: data.currency,
        eventId: data.eventId ?? null,
      },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error('[POST /api/campaigns]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
