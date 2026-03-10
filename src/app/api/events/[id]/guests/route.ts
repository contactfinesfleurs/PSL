import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseBodyJson, getProfileId, unauthorizedResponse } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const GUEST_CATEGORIES = ["VIP", "PRESS", "BUYER", "INFLUENCER", "INDUSTRY", "GUEST"] as const;
const RSVP_STATUSES = ["INVITED", "CONFIRMED", "DECLINED", "WAITLIST"] as const;

const GuestCreateSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  instagram: z.string().max(100).optional().nullable(),
  company: z.string().max(200).optional().nullable(),
  title: z.string().max(200).optional().nullable(),
  category: z.enum(GUEST_CATEGORIES).default("GUEST"),
  invitedBy: z.string().max(200).optional().nullable(),
  rsvpStatus: z.enum(RSVP_STATUSES).default("INVITED"),
  tableNumber: z.string().max(20).optional().nullable(),
  seatNumber: z.string().max(20).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export async function GET(
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

  const guests = await prisma.eventGuest.findMany({
    where: { eventId: id },
    orderBy: [{ category: "asc" }, { lastName: "asc" }],
  });
  return NextResponse.json(guests);
}

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

  const result = await parseBodyJson(req, GuestCreateSchema);
  if (!result.success) return result.response;
  const data = result.data;

  const guest = await prisma.eventGuest.create({
    data: {
      eventId: id,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email ?? null,
      phone: data.phone ?? null,
      instagram: data.instagram ?? null,
      company: data.company ?? null,
      title: data.title ?? null,
      category: data.category,
      invitedBy: data.invitedBy ?? null,
      rsvpStatus: data.rsvpStatus,
      tableNumber: data.tableNumber ?? null,
      seatNumber: data.seatNumber ?? null,
      notes: data.notes ?? null,
    },
  });

  return NextResponse.json(guest, { status: 201 });
}
