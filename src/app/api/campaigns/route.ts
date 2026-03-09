import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseBodyJson, validateEnum } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

// ─── Enums (must match Prisma schema comments) ────────────────────────────

// Schema: DRAFT | ACTIVE | PAUSED | COMPLETED | CANCELLED
const CAMPAIGN_STATUSES = ["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"] as const;
// Schema: DIGITAL | PRINT | OOH | SOCIAL | INFLUENCER | OTHER
const CAMPAIGN_TYPES = ["DIGITAL", "PRINT", "OOH", "SOCIAL", "INFLUENCER", "OTHER"] as const;

// ─── Schemas ───────────────────────────────────────────────────────────────

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

// ─── Handlers ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = validateEnum(searchParams.get("status"), CAMPAIGN_STATUSES);
  const type = validateEnum(searchParams.get("type"), CAMPAIGN_TYPES);

  const campaigns = await prisma.campaign.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
    },
    include: {
      products: { include: { product: true } },
      event: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(campaigns);
}

export async function POST(req: NextRequest) {
  const result = await parseBodyJson(req, CampaignCreateSchema);
  if (!result.success) return result.response;
  const data = result.data;

  const campaign = await prisma.campaign.create({
    data: {
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
