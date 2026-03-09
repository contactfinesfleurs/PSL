import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseBodyJson, validateEnum, getProfileId, unauthorizedResponse, parsePagination } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const CAMPAIGN_STATUSES = ["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"] as const;
const CAMPAIGN_TYPES = ["DIGITAL", "PRINT", "OOH", "SOCIAL", "INFLUENCER", "OTHER"] as const;

const CampaignCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  type: z.enum(CAMPAIGN_TYPES),
  status: z.enum(CAMPAIGN_STATUSES).default("DRAFT"),
  startAt: z.string().datetime().optional().nullable(),
  endAt: z.string().datetime().optional().nullable(),
  budget: z.number().positive().optional().nullable(),
  currency: z.string().length(3).default("EUR"),
  eventId: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const profileId = getProfileId(req);
  if (!profileId) return unauthorizedResponse();

  const { searchParams } = new URL(req.url);
  const status = validateEnum(searchParams.get("status"), CAMPAIGN_STATUSES);
  const type = validateEnum(searchParams.get("type"), CAMPAIGN_TYPES);
  const { skip, take, page, limit } = parsePagination(searchParams);

  const where = {
    profileId,
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
}

export async function POST(req: NextRequest) {
  const profileId = getProfileId(req);
  if (!profileId) return unauthorizedResponse();

  const result = await parseBodyJson(req, CampaignCreateSchema);
  if (!result.success) return result.response;
  const data = result.data;

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
}
