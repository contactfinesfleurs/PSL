import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseBodyJson, getProfileId, unauthorizedResponse } from "@/lib/api-helpers";
import { LOAN_PURPOSE_VALUES } from "@/lib/constants";
import { getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const LoanCreateSchema = z.object({
  sampleId: z.string().min(1),
  contactName: z.string().min(1).max(200),
  contactRole: z.string().max(100).optional().nullable(),
  publication: z.string().max(200).optional().nullable(),
  purpose: z.enum(LOAN_PURPOSE_VALUES),
  sentAt: z.string().datetime().optional(),
  dueAt: z.string().datetime().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const limited = await rateLimitResponse(`loans:${getClientIp(req)}`, "loose");
    if (limited) return limited;
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

    const loans = await prisma.sampleLoan.findMany({
      where: { productId: id },
      orderBy: { sentAt: "desc" },
    });
    return NextResponse.json(loans);
  } catch (error) {
    console.error('[GET /api/products/[id]/loans]', error);
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

    const result = await parseBodyJson(req, LoanCreateSchema);
    if (!result.success) return result.response;
    const data = result.data;

    // Verify the sample belongs to this product (prevents cross-product loan association)
    const sample = await prisma.sample.findFirst({
      where: { id: data.sampleId, productId: id },
    });
    if (!sample) return NextResponse.json({ error: "Sample introuvable" }, { status: 404 });

    const loan = await prisma.sampleLoan.create({
      data: {
        productId: id,
        sampleId: data.sampleId,
        contactName: data.contactName,
        contactRole: data.contactRole ?? null,
        publication: data.publication ?? null,
        purpose: data.purpose,
        sentAt: data.sentAt ? new Date(data.sentAt) : new Date(),
        dueAt: data.dueAt ? new Date(data.dueAt) : null,
        notes: data.notes ?? null,
      },
    });

    return NextResponse.json(loan, { status: 201 });
  } catch (error) {
    console.error('[POST /api/products/[id]/loans]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
