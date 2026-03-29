import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseBodyJson, getProfileId, unauthorizedResponse } from "@/lib/api-helpers";

export const dynamic = 'force-dynamic';

const EventProductSchema = z.object({
  productId: z.string().min(1),
  notes: z.string().nullable().optional(),
  look: z.number().int().nullable().optional(),
});

const EventProductDeleteSchema = z.object({
  productId: z.string().min(1),
});

export async function POST(
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

    const result = await parseBodyJson(req, EventProductSchema);
    if (!result.success) return result.response;
    const body = result.data;

    const eventProduct = await prisma.$transaction(async (tx) => {
      // Verify event ownership
      const event = await tx.event.findFirst({
        where: { id, profileId, deletedAt: null },
      });
      if (!event) return null;

      // Verify product belongs to the same profile (prevents cross-tenant linking)
      const product = await tx.product.findFirst({
        where: { id: body.productId, profileId, deletedAt: null },
      });
      if (!product) return null;

      return tx.eventProduct.upsert({
        where: {
          eventId_productId: {
            eventId: id,
            productId: body.productId,
          },
        },
        create: {
          eventId: id,
          productId: body.productId,
          notes: body.notes ?? null,
          look: body.look ?? null,
        },
        update: {
          notes: body.notes ?? null,
          look: body.look ?? null,
        },
      });
    });

    if (!eventProduct) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(eventProduct, { status: 201 });
  } catch (error) {
    console.error('[POST /api/events/[id]/products]', error);
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

    const result = await parseBodyJson(req, EventProductDeleteSchema);
    if (!result.success) return result.response;
    const { productId } = result.data;

    const deleted = await prisma.$transaction(async (tx) => {
      // Verify event ownership
      const event = await tx.event.findFirst({
        where: { id, profileId, deletedAt: null },
      });
      if (!event) return null;

      // Verify product belongs to the same profile and isn't deleted
      const product = await tx.product.findFirst({
        where: { id: productId, profileId, deletedAt: null },
      });
      if (!product) return null;

      return tx.eventProduct.delete({
        where: {
          eventId_productId: { eventId: id, productId },
        },
      });
    });

    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/events/[id]/products]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
