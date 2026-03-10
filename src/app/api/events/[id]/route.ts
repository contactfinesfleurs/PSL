import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseBodyJson, getProfileId, unauthorizedResponse } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";
import { EVENT_TYPE_VALUES, EVENT_STATUS_VALUES } from "@/lib/constants";

export const dynamic = "force-dynamic";

const EventPatchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  type: z.enum(EVENT_TYPE_VALUES).optional(),
  status: z.enum(EVENT_STATUS_VALUES).optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().nullable().optional(),
  location: z.string().max(500).nullable().optional(),
  venue: z.string().max(300).nullable().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profileId = getProfileId(req);
    if (!profileId) return unauthorizedResponse();

    const { id } = await params;
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }
    const event = await prisma.event.findUnique({
      where: { id, profileId, deletedAt: null },
      include: {
        campaigns: { include: { products: { include: { product: true } } } },
        products: { include: { product: true } },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error('[GET /api/events/[id]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profileId = getProfileId(req);
    if (!profileId) return unauthorizedResponse();

    const { id } = await params;
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const existing = await prisma.event.findUnique({ where: { id, profileId, deletedAt: null } });
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
  } catch (error) {
    console.error('[PATCH /api/events/[id]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profileId = getProfileId(req);
    if (!profileId) return unauthorizedResponse();

    const { id } = await params;
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const existing = await prisma.event.findUnique({ where: { id, profileId, deletedAt: null } });
    if (!existing) {
      return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
    }

    await prisma.event.update({ where: { id }, data: { deletedAt: new Date() } });
    logAudit("EVENT_DELETE", profileId, "event", id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/events/[id]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
