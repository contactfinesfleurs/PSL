import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseBodyJson } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const PLACEMENT_TYPES = ["PRINT", "DIGITAL", "SOCIAL", "TV", "PODCAST"] as const;

const PlacementCreateSchema = z.object({
  publication: z.string().min(1).max(200),
  type: z.enum(PLACEMENT_TYPES),
  publishedAt: z.string().datetime(),
  url: z.string().url().optional().nullable(),
  screenshotPath: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  reach: z.number().int().positive().optional().nullable(),
  sampleLoanId: z.string().optional().nullable(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const placements = await prisma.mediaPlacement.findMany({
    where: { productId: id },
    orderBy: { publishedAt: "desc" },
  });
  return NextResponse.json(placements);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await parseBodyJson(req, PlacementCreateSchema);
  if (!result.success) return result.response;
  const data = result.data;

  const placement = await prisma.mediaPlacement.create({
    data: {
      productId: id,
      publication: data.publication,
      type: data.type,
      publishedAt: new Date(data.publishedAt),
      url: data.url ?? null,
      screenshotPath: data.screenshotPath ?? null,
      notes: data.notes ?? null,
      reach: data.reach ?? null,
      sampleLoanId: data.sampleLoanId ?? null,
    },
  });

  return NextResponse.json(placement, { status: 201 });
}
