import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseBodyJson, getProfileId, unauthorizedResponse } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

function generateShareCode(): string {
  return randomBytes(5).toString("hex"); // 10 hex chars, URL-safe
}

const CreateShareSchema = z.object({
  label: z.string().max(200).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

// GET /api/products/[id]/shares — list share codes for a product (owner only)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profileId = getProfileId(req);
    if (!profileId) return unauthorizedResponse();

    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id, profileId, deletedAt: null },
    });
    if (!product) {
      return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
    }

    const shares = await prisma.productShare.findMany({
      where: { productId: id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { contributions: true } } },
    });

    return NextResponse.json(shares);
  } catch (error) {
    console.error("[GET /api/products/[id]/shares]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/products/[id]/shares — create a share code (owner only)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profileId = getProfileId(req);
    if (!profileId) return unauthorizedResponse();

    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id, profileId, deletedAt: null },
    });
    if (!product) {
      return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
    }

    const result = await parseBodyJson(req, CreateShareSchema);
    if (!result.success) return result.response;
    const body = result.data;

    const share = await prisma.productShare.create({
      data: {
        code: generateShareCode(),
        productId: id,
        profileId,
        label: body.label ?? null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
    });

    logAudit("SHARE_CREATE", profileId, "product", id, {
      shareId: share.id,
      code: share.code,
    });

    return NextResponse.json(share, { status: 201 });
  } catch (error) {
    console.error("[POST /api/products/[id]/shares]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
