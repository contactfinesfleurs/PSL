import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseBodyJson, getProfileId, unauthorizedResponse } from "@/lib/api-helpers";
import { PLACEMENT_TYPE_VALUES } from "@/lib/constants";

export const dynamic = "force-dynamic";

const PlacementCreateSchema = z.object({
  publication: z.string().min(1).max(200),
  type: z.enum(PLACEMENT_TYPE_VALUES),
  publishedAt: z.string().datetime(),
  url: z.string().url().optional().nullable(),
  screenshotPath: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  reach: z.number().int().positive().optional().nullable(),
  sampleLoanId: z.string().optional().nullable(),
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

    // Verify product ownership
    const product = await prisma.product.findFirst({
      where: { id, profileId, deletedAt: null },
    });
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const placements = await prisma.mediaPlacement.findMany({
      where: { productId: id },
      orderBy: { publishedAt: "desc" },
      take: 200,
    });
    return NextResponse.json(placements);
  } catch (error) {
    console.error('[GET /api/products/[id]/placements]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    // Verify product ownership
    const product = await prisma.product.findFirst({
      where: { id, profileId, deletedAt: null },
    });
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const result = await parseBodyJson(req, PlacementCreateSchema);
    if (!result.success) return result.response;
    const data = result.data;

    // Verify the referenced sampleLoan belongs to this product (prevents cross-tenant linking)
    if (data.sampleLoanId) {
      const loan = await prisma.sampleLoan.findFirst({
        where: { id: data.sampleLoanId, productId: id },
      });
      if (!loan) return NextResponse.json({ error: "Loan introuvable" }, { status: 404 });
    }

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
  } catch (error) {
    console.error('[POST /api/products/[id]/placements]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
