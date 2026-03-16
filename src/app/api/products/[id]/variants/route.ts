import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseBodyJson, getProfileId, unauthorizedResponse } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";
import { getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

const VARIANT_SELECT = {
  id: true,
  name: true,
  sku: true,
  colors: true,
  family: true,
  season: true,
  year: true,
} as const;

// GET /api/products/[id]/variants — list variants of this product
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const limited = await rateLimitResponse(`variants:${getClientIp(req)}`, "loose");
    if (limited) return limited;
    const profileId = getProfileId(req);
    if (!profileId) return unauthorizedResponse();

    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id, profileId, deletedAt: null },
      select: { variantGroupId: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
    }

    if (!product.variantGroupId) {
      return NextResponse.json([]);
    }

    const variants = await prisma.product.findMany({
      where: {
        variantGroupId: product.variantGroupId,
        id: { not: id },
        profileId,
        deletedAt: null,
      },
      select: VARIANT_SELECT,
    });

    return NextResponse.json(variants);
  } catch (error) {
    console.error("[GET /api/products/[id]/variants]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const LinkSchema = z.object({
  variantId: z.string().min(1),
});

// POST /api/products/[id]/variants — link a product as a variant
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profileId = getProfileId(req);
    if (!profileId) return unauthorizedResponse();

    const { id } = await params;

    const result = await parseBodyJson(req, LinkSchema);
    if (!result.success) return result.response;
    const { variantId } = result.data;

    if (variantId === id) {
      return NextResponse.json({ error: "Un produit ne peut pas être sa propre variante." }, { status: 400 });
    }

    const [productA, productB] = await Promise.all([
      prisma.product.findUnique({ where: { id, profileId, deletedAt: null }, select: { id: true, variantGroupId: true } }),
      prisma.product.findUnique({ where: { id: variantId, profileId, deletedAt: null }, select: { id: true, variantGroupId: true } }),
    ]);

    if (!productA || !productB) {
      return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
    }

    // Determine target group ID
    const groupId = productA.variantGroupId ?? productB.variantGroupId ?? randomUUID();

    // If they already share the same group, nothing to do
    if (productA.variantGroupId === productB.variantGroupId && productA.variantGroupId !== null) {
      return NextResponse.json({ ok: true });
    }

    // If B had a different group, migrate all products in B's group to the target group
    const updates: Promise<unknown>[] = [];
    if (productB.variantGroupId && productB.variantGroupId !== groupId) {
      updates.push(
        prisma.product.updateMany({
          where: { variantGroupId: productB.variantGroupId, profileId },
          data: { variantGroupId: groupId },
        })
      );
    }

    updates.push(
      prisma.product.updateMany({
        where: { id: { in: [id, variantId] }, profileId },
        data: { variantGroupId: groupId },
      })
    );

    await Promise.all(updates);

    logAudit("PRODUCT_VARIANT_LINK", profileId, "product", id, { variantId, groupId });

    const variants = await prisma.product.findMany({
      where: { variantGroupId: groupId, id: { not: id }, profileId, deletedAt: null },
      select: VARIANT_SELECT,
    });

    return NextResponse.json(variants);
  } catch (error) {
    console.error("[POST /api/products/[id]/variants]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
