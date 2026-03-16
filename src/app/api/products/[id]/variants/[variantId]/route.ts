import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProfileId, unauthorizedResponse } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// DELETE /api/products/[id]/variants/[variantId] — unlink a variant
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  try {
    const profileId = getProfileId(req);
    if (!profileId) return unauthorizedResponse();

    const { id, variantId } = await params;

    const [productA, productB] = await Promise.all([
      prisma.product.findUnique({ where: { id, profileId, deletedAt: null }, select: { variantGroupId: true } }),
      prisma.product.findUnique({ where: { id: variantId, profileId, deletedAt: null }, select: { variantGroupId: true } }),
    ]);

    if (!productA || !productB) {
      return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
    }

    if (!productA.variantGroupId || productA.variantGroupId !== productB.variantGroupId) {
      return NextResponse.json({ error: "Ces produits ne sont pas des variantes liées." }, { status: 400 });
    }

    const groupId = productA.variantGroupId;

    // Count how many products are in this group
    const groupSize = await prisma.product.count({
      where: { variantGroupId: groupId, profileId, deletedAt: null },
    });

    if (groupSize <= 2) {
      // Only 2 left — dissolve the group entirely
      await prisma.product.updateMany({
        where: { variantGroupId: groupId, profileId },
        data: { variantGroupId: null },
      });
    } else {
      // Remove only the target variant from the group.
      // profileId is required to prevent cross-tenant IDOR.
      await prisma.product.update({
        where: { id: variantId, profileId },
        data: { variantGroupId: null },
      });
    }

    logAudit("PRODUCT_VARIANT_UNLINK", profileId, "product", id, { variantId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/products/[id]/variants/[variantId]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
