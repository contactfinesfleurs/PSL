import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseBodyJson, getProfileId, unauthorizedResponse } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ code: string }> };

const AddProductsSchema = z.object({
  productIds: z.array(z.string()).min(1),
});

// POST /api/projects/[code]/products — add products to a project (owner only)
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const profileId = getProfileId(req);
    if (!profileId) return unauthorizedResponse();

    const { code } = await params;

    const project = await prisma.project.findUnique({ where: { code } });
    if (!project || project.profileId !== profileId) {
      return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
    }

    const result = await parseBodyJson(req, AddProductsSchema);
    if (!result.success) return result.response;
    const { productIds } = result.data;

    // Verify all products belong to the owner
    const owned = await prisma.product.count({
      where: { id: { in: productIds }, profileId, deletedAt: null },
    });
    if (owned !== productIds.length) {
      return NextResponse.json(
        { error: "Un ou plusieurs produits sont introuvables." },
        { status: 422 }
      );
    }

    // Upsert — skip duplicates silently
    await prisma.projectProduct.createMany({
      data: productIds.map((productId) => ({ projectId: project.id, productId })),
      skipDuplicates: true,
    });

    logAudit("PROJECT_PRODUCTS_ADD", profileId, "project", project.id, {
      productIds,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/projects/[code]/products]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
