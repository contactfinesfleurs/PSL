import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseBodyJson, getProfileId, unauthorizedResponse } from "@/lib/api-helpers";
import { storeFile, MAX_FILE_SIZE, ALLOWED_MIME_TYPES } from "@/lib/storage";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ code: string; productId: string }> };

const NoteContributionSchema = z.object({
  note: z.string().min(1).max(5000),
});

/**
 * GET /api/projects/[code]/products/[productId]/contributions
 * Owner + collaborators can list contributions for a specific product.
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const profileId = getProfileId(req);
    if (!profileId) return unauthorizedResponse();

    const { code, productId } = await params;

    const project = await prisma.project.findUnique({
      where: { code },
      include: { collaborators: { select: { profileId: true } } },
    });

    if (!project) {
      return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
    }

    const isOwner = project.profileId === profileId;
    const isCollaborator = project.collaborators.some((c) => c.profileId === profileId);
    if (!isOwner && !isCollaborator) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }

    const contributions = await prisma.projectContribution.findMany({
      where: { projectId: project.id, productId },
      orderBy: { createdAt: "desc" },
      include: { profile: { select: { id: true, name: true } } },
    });

    return NextResponse.json(contributions);
  } catch (error) {
    console.error("[GET contributions]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/projects/[code]/products/[productId]/contributions
 * Collaborators add photos and/or a note. Owner can also contribute.
 * Accepts either multipart/form-data (with files) or application/json (note only).
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const profileId = getProfileId(req);
    if (!profileId) return unauthorizedResponse();

    const { code, productId } = await params;

    const project = await prisma.project.findUnique({
      where: { code },
      include: { collaborators: { select: { profileId: true } } },
    });

    if (!project) {
      return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
    }

    const isOwner = project.profileId === profileId;
    const isCollaborator = project.collaborators.some((c) => c.profileId === profileId);
    if (!isOwner && !isCollaborator) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }

    // Verify the product is in this project
    const link = await prisma.projectProduct.findUnique({
      where: { projectId_productId: { projectId: project.id, productId } },
    });
    if (!link) {
      return NextResponse.json({ error: "Produit non trouvé dans ce projet." }, { status: 404 });
    }

    const contentType = req.headers.get("content-type") ?? "";

    let photoPaths: string[] = [];
    let note: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const files = formData.getAll("files") as File[];
      note = (formData.get("note") as string | null)?.trim() || null;

      for (const file of files) {
        if (!ALLOWED_MIME_TYPES.has(file.type)) {
          return NextResponse.json(
            { error: `Type de fichier non autorisé : ${file.name}` },
            { status: 415 }
          );
        }
        if (file.size > MAX_FILE_SIZE) {
          return NextResponse.json(
            { error: `Fichier trop volumineux : ${file.name}` },
            { status: 413 }
          );
        }
      }

      if (files.length > 0) {
        const stored = await Promise.all(files.map((f) => storeFile(f, "project-contributions")));
        photoPaths = stored.map((s) => s.path);
      }
    } else {
      const result = await parseBodyJson(req, NoteContributionSchema);
      if (!result.success) return result.response;
      note = result.data.note;
    }

    if (photoPaths.length === 0 && !note) {
      return NextResponse.json(
        { error: "Ajoutez au moins une photo ou une note." },
        { status: 400 }
      );
    }

    const contribution = await prisma.projectContribution.create({
      data: {
        projectId: project.id,
        productId,
        profileId,
        photoPaths: photoPaths.length > 0 ? JSON.stringify(photoPaths) : null,
        note,
      },
      include: { profile: { select: { id: true, name: true } } },
    });

    logAudit("PROJECT_CONTRIBUTION", profileId, "project", project.id, {
      productId,
      photoCount: photoPaths.length,
      hasNote: !!note,
    });

    return NextResponse.json(contribution, { status: 201 });
  } catch (error) {
    console.error("[POST contributions]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
