import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseBodyJson } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const LOAN_PURPOSES = ["EDITORIAL", "PRESS", "EVENT", "SHOWROOM", "INFLUENCER", "CELEBRITY"] as const;

const LoanCreateSchema = z.object({
  sampleId: z.string().min(1),
  contactName: z.string().min(1).max(200),
  contactRole: z.string().max(100).optional().nullable(),
  publication: z.string().max(200).optional().nullable(),
  purpose: z.enum(LOAN_PURPOSES),
  sentAt: z.string().datetime().optional(),
  dueAt: z.string().datetime().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const loans = await prisma.sampleLoan.findMany({
    where: { productId: id },
    orderBy: { sentAt: "desc" },
  });
  return NextResponse.json(loans);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await parseBodyJson(req, LoanCreateSchema);
  if (!result.success) return result.response;
  const data = result.data;

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
}
