import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const type = searchParams.get("type");

  const events = await prisma.event.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(type ? { type } : {}),
    },
    include: {
      campaigns: true,
      products: { include: { product: true } },
    },
    orderBy: { startAt: "asc" },
  });

  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const event = await prisma.event.create({
    data: {
      name: body.name,
      description: body.description ?? null,
      type: body.type,
      status: body.status ?? "DRAFT",
      startAt: new Date(body.startAt),
      endAt: body.endAt ? new Date(body.endAt) : null,
      location: body.location ?? null,
      venue: body.venue ?? null,
    },
  });

  return NextResponse.json(event, { status: 201 });
}
