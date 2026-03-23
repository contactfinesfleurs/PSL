import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProfileId, unauthorizedResponse } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ code: string; productId: string }> };

// DELETE /api/projects/[code]/products/[productId] — remove a product (owner only)
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const profileId = getProfileId(req);
    if (!profileId) return unauthorizedResponse();

    const { code, productId } = await params;

    const project = await prisma.project.findUnique({ where: { code } });
    if (!project || project.profileId !== profileId) {
      return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
    }

    await prisma.projectProduct.deleteMany({
      where: { projectId: project.id, productId },
    });

    logAudit("PROJECT_PRODUCT_REMOVE", profileId, "project", project.id, { productId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/projects/[code]/products/[productId]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
