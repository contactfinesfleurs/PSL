import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CAMPAIGN_TYPES } from "@/lib/utils";

export const dynamic = 'force-dynamic';

const VALID_TYPES = new Set<string>(CAMPAIGN_TYPES.map((t) => t.value));
const VALID_STATUSES = new Set<string>(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"]);

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

  if (body.type !== undefined && !VALID_TYPES.has(body.type as string)) {
    return NextResponse.json({ error: "Type invalide" }, { status: 422 });
  }
  if (body.status !== undefined && !VALID_STATUSES.has(body.status as string)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 422 });
  }

  try {
    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        ...(body.name !== undefined && {
          name: typeof body.name === "string" ? body.name.trim() : String(body.name),
        }),
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
          budget: typeof body.budget === "number" ? body.budget : null,
        }),
        ...(body.currency !== undefined && { currency: body.currency as string }),
        ...(body.eventId !== undefined && {
          eventId: body.eventId as string | null,
        }),
      },
    });
    return NextResponse.json(campaign);
  } catch {
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
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
