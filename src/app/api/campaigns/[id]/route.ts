import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CAMPAIGN_TYPES, CAMPAIGN_STATUSES, CURRENCIES } from "@/lib/utils";
import {
  MAX_NAME_LENGTH,
  MAX_TEXT_LENGTH,
  isValidDate,
  isValidBudget,
  isPrismaNotFound,
  isPrismaFKViolation,
} from "@/lib/validation";

export const dynamic = 'force-dynamic';

const VALID_TYPES = new Set<string>(CAMPAIGN_TYPES.map((t) => t.value));
const VALID_STATUSES = new Set<string>(CAMPAIGN_STATUSES.map((s) => s.value));
const VALID_CURRENCIES = new Set<string>(CURRENCIES);

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
  if (body.type !== undefined && (typeof body.type !== "string" || !VALID_TYPES.has(body.type))) {
    return NextResponse.json({ error: "Type invalide" }, { status: 422 });
  }
  if (body.status !== undefined && (typeof body.status !== "string" || !VALID_STATUSES.has(body.status))) {
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
  if (body.eventId !== undefined && body.eventId !== null && typeof body.eventId !== "string") {
    return NextResponse.json({ error: "eventId invalide" }, { status: 422 });
  }

  try {
    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: (body.name as string).trim() }),
        ...(body.description !== undefined && { description: body.description as string | null }),
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
        ...(body.eventId !== undefined && { eventId: body.eventId as string | null }),
      },
    });
    return NextResponse.json(campaign);
  } catch (err) {
    if (isPrismaNotFound(err)) {
      return NextResponse.json({ error: "Campagne introuvable" }, { status: 404 });
    }
    if (isPrismaFKViolation(err)) {
      return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
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
    if (isPrismaNotFound(err)) {
      return NextResponse.json({ error: "Campagne introuvable" }, { status: 404 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
