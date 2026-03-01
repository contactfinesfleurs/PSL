import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CAMPAIGN_TYPES, CAMPAIGN_STATUSES, CURRENCIES } from "@/lib/utils";
import { MAX_NAME_LENGTH, MAX_TEXT_LENGTH, isValidDate, isValidBudget } from "@/lib/validation";

export const dynamic = 'force-dynamic';

const VALID_TYPES = new Set<string>(CAMPAIGN_TYPES.map((t) => t.value));
const VALID_STATUSES = new Set<string>(CAMPAIGN_STATUSES.map((s) => s.value));
const VALID_CURRENCIES = new Set<string>(CURRENCIES);

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
  if (body.name.trim().length > MAX_NAME_LENGTH) {
    return NextResponse.json({ error: `Nom trop long (max ${MAX_NAME_LENGTH} car.)` }, { status: 422 });
  }
  if (!body.type || !VALID_TYPES.has(body.type as string)) {
    return NextResponse.json({ error: "Type invalide" }, { status: 422 });
  }
  if (body.status !== undefined && !VALID_STATUSES.has(body.status as string)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 422 });
  }
  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== "string" || body.description.length > MAX_TEXT_LENGTH) {
      return NextResponse.json({ error: `Description trop longue (max ${MAX_TEXT_LENGTH} car.)` }, { status: 422 });
    }
  }
  if (body.budget !== undefined && body.budget !== null && !isValidBudget(body.budget)) {
    return NextResponse.json({ error: "Budget invalide (nombre positif attendu)" }, { status: 422 });
  }
  if (body.currency !== undefined && body.currency !== null) {
    if (typeof body.currency !== "string" || !VALID_CURRENCIES.has(body.currency)) {
      return NextResponse.json({ error: "Devise invalide" }, { status: 422 });
    }
  }
  if (body.startAt !== undefined && body.startAt !== null && !isValidDate(body.startAt)) {
    return NextResponse.json({ error: "Date de début invalide" }, { status: 422 });
  }
  if (body.endAt !== undefined && body.endAt !== null && !isValidDate(body.endAt)) {
    return NextResponse.json({ error: "Date de fin invalide" }, { status: 422 });
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
        budget: isValidBudget(body.budget) ? body.budget : null,
        currency: typeof body.currency === "string" && VALID_CURRENCIES.has(body.currency)
          ? body.currency
          : "EUR",
        eventId: typeof body.eventId === "string" ? body.eventId : null,
      },
    });
    return NextResponse.json(campaign, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
