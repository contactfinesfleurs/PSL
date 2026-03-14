import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProfileId, unauthorizedResponse } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";
import { safeParseArray } from "@/lib/formatters";
import { deleteStoredFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ code: string }> };

/**
 * GET /api/projects/[code]
 * Owner sees everything. Collaborator sees products + their own contributions.
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const profileId = getProfileId(req);
    if (!profileId) return unauthorizedResponse();

    const { code } = await params;

    const project = await prisma.project.findUnique({
      where: { code },
      include: {
        products: {
          include: { product: true },
          orderBy: { addedAt: "asc" },
        },
        collaborators: {
          include: { profile: { select: { id: true, name: true } } },
        },
        contributions: {
          orderBy: { createdAt: "desc" },
          include: { profile: { select: { id: true, name: true } } },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
    }

    const isOwner = project.profileId === profileId;
    const isCollaborator = project.collaborators.some(
      (c: { profileId: string }) => c.profileId === profileId
    );

    if (!isOwner && !isCollaborator) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }

    // Filter out soft-deleted products, then remap sketch paths
    const products = project.products
      .filter((pp: { product: { deletedAt: Date | null } | null }) => pp.product && !pp.product.deletedAt)
      .map((pp: { product: { sketchPaths: string | null; [key: string]: unknown }; addedAt: Date }) => ({
        ...pp.product,
        sketchPaths: safeParseArray(pp.product!.sketchPaths as string | null),
        addedAt: pp.addedAt,
      }));

    // Collaborators only see their own contributions, not everyone else's.
    const visibleContributions = isOwner
      ? project.contributions
      : project.contributions.filter(
          (c: { profileId: string }) => c.profileId === profileId
        );

    return NextResponse.json({
      ...project,
      contributions: visibleContributions,
      isOwner,
      products,
    });
  } catch (error) {
    console.error("[GET /api/projects/[code]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[code] — owner only
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const profileId = getProfileId(req);
    if (!profileId) return unauthorizedResponse();

    const { code } = await params;

    const project = await prisma.project.findUnique({
      where: { code },
      include: { contributions: { select: { photoPaths: true } } },
    });
    if (!project || project.profileId !== profileId) {
      return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
    }

    for (const contrib of project.contributions) {
      for (const p of safeParseArray(contrib.photoPaths)) {
        await deleteStoredFile(p);
      }
    }

    await prisma.project.delete({ where: { code } });
    logAudit("PROJECT_DELETE", profileId, "project", project.id, { code });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/projects/[code]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
