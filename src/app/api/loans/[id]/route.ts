import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseBodyJson, getProfileId } from "@/lib/api-helpers";
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
  const { id } = await params;
  const profileId = getProfileId(req);
  const result = await parseBodyJson(req, LoanPatchSchema);
  if (!result.success) return result.response;
  const body = result.data;

  const loan = await prisma.sampleLoan.update({
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

  return NextResponse.json(loan);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.sampleLoan.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
