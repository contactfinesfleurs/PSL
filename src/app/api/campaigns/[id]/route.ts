import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CAMPAIGN_TYPES } from "@/lib/utils";
import { Prisma } from "@prisma/client";

export const dynamic = 'force-dynamic';

const VALID_TYPES = new Set<string>(CAMPAIGN_TYPES.map((t) => t.value));
const VALID_STATUSES = new Set<string>(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"]);
const VALID_CURRENCIES = new Set(["EUR", "USD", "GBP", "CHF", "JPY", "CNY"]);

const MAX_NAME_LENGTH = 200;
const MAX_TEXT_LENGTH = 5000;

function isValidDate(v: unknown): v is string {
  if (typeof v !== "string") return false;
  return !isNaN(new Date(v).getTime());
}

function isValidBudget(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        products: { include: { product: true } },
        event: true,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campagne introuvable" }, { status: 404 });
    }
    return NextResponse.json(campaign);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  // Name validation
  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "Nom invalide" }, { status: 422 });
    }
    if (body.name.trim().length > MAX_NAME_LENGTH) {
      return NextResponse.json({ error: `Nom trop long (max ${MAX_NAME_LENGTH} car.)` }, { status: 422 });
    }
  }
  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== "string" || body.description.length > MAX_TEXT_LENGTH) {
      return NextResponse.json({ error: `Description trop longue (max ${MAX_TEXT_LENGTH} car.)` }, { status: 422 });
    }
  }
  if (body.type !== undefined && !VALID_TYPES.has(body.type as string)) {
    return NextResponse.json({ error: "Type invalide" }, { status: 422 });
  }
  if (body.status !== undefined && !VALID_STATUSES.has(body.status as string)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 422 });
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
    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: (body.name as string).trim() }),
        ...(body.description !== undefined && {
          description: body.description as string | null,
        }),
        ...(body.type !== undefined && { type: body.type as string }),
        ...(body.status !== undefined && { status: body.status as string }),
        ...(body.startAt !== undefined && {
          startAt: body.startAt ? new Date(body.startAt as string) : null,
        }),
        ...(body.endAt !== undefined && {
          endAt: body.endAt ? new Date(body.endAt as string) : null,
        }),
        ...(body.budget !== undefined && {
          budget: isValidBudget(body.budget) ? body.budget : null,
        }),
        ...(body.currency !== undefined && body.currency !== null && {
          currency: body.currency as string,
        }),
        ...(body.eventId !== undefined && {
          eventId: body.eventId as string | null,
        }),
      },
    });
    return NextResponse.json(campaign);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Campagne introuvable" }, { status: 404 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.campaign.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Campagne introuvable" }, { status: 404 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
