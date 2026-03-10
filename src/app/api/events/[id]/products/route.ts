import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseBodyJson, getProfileId, unauthorizedResponse } from "@/lib/api-helpers";

export const dynamic = 'force-dynamic';

const EventProductSchema = z.object({
  productId: z.string().min(1),
  notes: z.string().nullable().optional(),
  look: z.string().nullable().optional(),
});

const EventProductDeleteSchema = z.object({
  productId: z.string().min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profileId = getProfileId(req);
  if (!profileId) return unauthorizedResponse();

  const { id } = await params;

  // Verify event ownership
  const event = await prisma.event.findFirst({
    where: { id, profileId, deletedAt: null },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await parseBodyJson(req, EventProductSchema);
  if (!result.success) return result.response;
  const body = result.data;

  const eventProduct = await prisma.eventProduct.upsert({
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

  return NextResponse.json(eventProduct, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profileId = getProfileId(req);
  if (!profileId) return unauthorizedResponse();

  const { id } = await params;

  // Verify event ownership
  const event = await prisma.event.findFirst({
    where: { id, profileId, deletedAt: null },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await parseBodyJson(req, EventProductDeleteSchema);
  if (!result.success) return result.response;
  const { productId } = result.data;

  await prisma.eventProduct.delete({
    where: {
      eventId_productId: { eventId: id, productId },
    },
  });

  return NextResponse.json({ success: true });
}
