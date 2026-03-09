import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseBodyJson, getProfileId, unauthorizedResponse } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const EventPatchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  type: z.enum(["SHOW", "PRESENTATION", "LAUNCH", "PRESS", "TRADE-SHOW", "OTHER"]).optional(),
  status: z.enum(["DRAFT", "CONFIRMED", "COMPLETED", "CANCELLED"]).optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().nullable().optional(),
  location: z.string().max(500).nullable().optional(),
  venue: z.string().max(300).nullable().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profileId = getProfileId(req);
  if (!profileId) return unauthorizedResponse();

  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id, profileId },
    include: {
      campaigns: { include: { products: { include: { product: true } } } },
      products: { include: { product: true } },
    },
  });

  if (!event) {
    return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
  }

  return NextResponse.json(event);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profileId = getProfileId(req);
  if (!profileId) return unauthorizedResponse();

  const { id } = await params;

  const existing = await prisma.event.findUnique({ where: { id, profileId } });
  if (!existing) {
    return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
  }

  const result = await parseBodyJson(req, EventPatchSchema);
  if (!result.success) return result.response;
  const body = result.data;

  const event = await prisma.event.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.type !== undefined && { type: body.type }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.startAt !== undefined && { startAt: new Date(body.startAt) }),
      ...(body.endAt !== undefined && {
        endAt: body.endAt ? new Date(body.endAt) : null,
      }),
      ...(body.location !== undefined && { location: body.location }),
      ...(body.venue !== undefined && { venue: body.venue }),
    },
  });

  logAudit("EVENT_PATCH", profileId, "event", id, { fields: Object.keys(body) });

  return NextResponse.json(event);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profileId = getProfileId(req);
  if (!profileId) return unauthorizedResponse();

  const { id } = await params;

  const existing = await prisma.event.findUnique({ where: { id, profileId } });
  if (!existing) {
    return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
  }

  await prisma.event.delete({ where: { id } });
  logAudit("EVENT_DELETE", profileId, "event", id);
  return NextResponse.json({ success: true });
}
