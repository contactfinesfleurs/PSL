import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseBodyJson, getProfileId, unauthorizedResponse } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const LoanPatchSchema = z.object({
  status: z.enum(["SENT", "RETURNED", "LOST"]).optional(),
  returnedAt: z.string().datetime().nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  contactName: z.string().min(1).max(200).optional(),
  contactRole: z.string().max(100).nullable().optional(),
  publication: z.string().max(200).nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profileId = getProfileId(req);
  if (!profileId) return unauthorizedResponse();

  const { id } = await params;
  if (!id || typeof id !== 'string' || id.trim() === '') {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  // Verify ownership via product.profileId
  const loan = await prisma.sampleLoan.findFirst({
    where: { id },
    include: { product: { select: { profileId: true } } },
  });
  if (!loan || loan.product.profileId !== profileId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await parseBodyJson(req, LoanPatchSchema);
  if (!result.success) return result.response;
  const body = result.data;

  const updated = await prisma.sampleLoan.update({
    where: { id },
    data: {
      ...(body.status !== undefined && { status: body.status }),
      ...(body.returnedAt !== undefined && {
        returnedAt: body.returnedAt ? new Date(body.returnedAt) : null,
      }),
      ...(body.dueAt !== undefined && {
        dueAt: body.dueAt ? new Date(body.dueAt) : null,
      }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.contactName !== undefined && { contactName: body.contactName }),
      ...(body.contactRole !== undefined && { contactRole: body.contactRole }),
      ...(body.publication !== undefined && { publication: body.publication }),
    },
  });

  logAudit("LOAN_PATCH", profileId, "sampleLoan", id, { fields: Object.keys(body) });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profileId = getProfileId(req);
  if (!profileId) return unauthorizedResponse();

  const { id } = await params;
  if (!id || typeof id !== 'string' || id.trim() === '') {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  // Verify ownership via product.profileId
  const loan = await prisma.sampleLoan.findFirst({
    where: { id },
    include: { product: { select: { profileId: true } } },
  });
  if (!loan || loan.product.profileId !== profileId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.sampleLoan.delete({ where: { id } });
  logAudit("LOAN_DELETE", profileId, "sampleLoan", id);
  return NextResponse.json({ success: true });
}
