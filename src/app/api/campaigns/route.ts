import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CAMPAIGN_TYPES } from "@/lib/utils";

export const dynamic = 'force-dynamic';

const VALID_TYPES = new Set<string>(CAMPAIGN_TYPES.map((t) => t.value));
const VALID_STATUSES = new Set<string>(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"]);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const type = searchParams.get("type");

  try {
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

  try {
    const campaign = await prisma.campaign.create({
      data: {
        name: (body.name as string).trim(),
        description: typeof body.description === "string" ? body.description : null,
        type: body.type as string,
        status: (body.status as string | undefined) ?? "DRAFT",
        startAt: body.startAt ? new Date(body.startAt as string) : null,
        endAt: body.endAt ? new Date(body.endAt as string) : null,
        budget: typeof body.budget === "number" ? body.budget : null,
        currency: typeof body.currency === "string" ? body.currency : "EUR",
        eventId: typeof body.eventId === "string" ? body.eventId : null,
      },
    });
    return NextResponse.json(campaign, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
