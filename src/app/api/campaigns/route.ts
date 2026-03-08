import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

// ─── Validation schemas ────────────────────────────────────────────────────

const CAMPAIGN_STATUSES = ["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"] as const;
const CAMPAIGN_TYPES = ["DIGITAL", "PRINT", "OOH", "SOCIAL", "INFLUENCER"] as const;

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
  const rawStatus = searchParams.get("status");
  const rawType = searchParams.get("type");

  // Validate enum query params — reject unknown values instead of using unsafe cast
  const status =
    rawStatus && (CAMPAIGN_STATUSES as readonly string[]).includes(rawStatus)
      ? (rawStatus as (typeof CAMPAIGN_STATUSES)[number])
      : undefined;
  const type =
    rawType && (CAMPAIGN_TYPES as readonly string[]).includes(rawType)
      ? (rawType as (typeof CAMPAIGN_TYPES)[number])
      : undefined;

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
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête JSON invalide." }, { status: 400 });
  }

  const parsed = CampaignCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides.", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const data = parsed.data;

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
