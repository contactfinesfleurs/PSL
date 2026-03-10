import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseBodyJson, getProfileId, unauthorizedResponse } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const GuestPatchSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  instagram: z.string().max(100).nullable().optional(),
  company: z.string().max(200).nullable().optional(),
  title: z.string().max(200).nullable().optional(),
  category: z.enum(["VIP", "PRESS", "BUYER", "INFLUENCER", "INDUSTRY", "GUEST"]).optional(),
  rsvpStatus: z.enum(["INVITED", "CONFIRMED", "DECLINED", "WAITLIST"]).optional(),
  checkedIn: z.boolean().optional(),
  tableNumber: z.string().max(20).nullable().optional(),
  seatNumber: z.string().max(20).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profileId = getProfileId(req);
  if (!profileId) return unauthorizedResponse();

  const { id } = await params;

  // Verify ownership via event.profileId
  const guest = await prisma.eventGuest.findFirst({
    where: { id },
    include: { event: { select: { profileId: true } } },
  });
  if (!guest || guest.event.profileId !== profileId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await parseBodyJson(req, GuestPatchSchema);
  if (!result.success) return result.response;
  const body = result.data;

  const now = new Date();
  const updated = await prisma.eventGuest.update({
    where: { id },
    data: {
      ...(body.firstName !== undefined && { firstName: body.firstName }),
      ...(body.lastName !== undefined && { lastName: body.lastName }),
      ...(body.email !== undefined && { email: body.email }),
      ...(body.phone !== undefined && { phone: body.phone }),
      ...(body.instagram !== undefined && { instagram: body.instagram }),
      ...(body.company !== undefined && { company: body.company }),
      ...(body.title !== undefined && { title: body.title }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.rsvpStatus !== undefined && { rsvpStatus: body.rsvpStatus }),
      ...(body.tableNumber !== undefined && { tableNumber: body.tableNumber }),
      ...(body.seatNumber !== undefined && { seatNumber: body.seatNumber }),
      ...(body.notes !== undefined && { notes: body.notes }),
      // Track check-in timestamp automatically
      ...(body.checkedIn !== undefined && {
        checkedIn: body.checkedIn,
        checkedInAt: body.checkedIn ? now : null,
      }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profileId = getProfileId(req);
  if (!profileId) return unauthorizedResponse();

  const { id } = await params;

  // Verify ownership via event.profileId
  const guest = await prisma.eventGuest.findFirst({
    where: { id },
    include: { event: { select: { profileId: true } } },
  });
  if (!guest || guest.event.profileId !== profileId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.eventGuest.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
