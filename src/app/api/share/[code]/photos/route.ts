import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { storeFile, MAX_FILE_SIZE, ALLOWED_MIME_TYPES } from "@/lib/storage";
import { logAudit } from "@/lib/audit";
import { getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// POST /api/share/[code]/photos — public: external user adds photos
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const ip = getClientIp(req);
    const limited = rateLimitResponse(ip);
    if (limited) return limited;

    const { code } = await params;

    const share = await prisma.productShare.findUnique({
      where: { code },
      include: { product: true },
    });

    if (!share || !share.product || share.product.deletedAt !== null) {
      return NextResponse.json({ error: "Lien de partage invalide." }, { status: 404 });
    }

    if (share.expiresAt && share.expiresAt < new Date()) {
      return NextResponse.json({ error: "Ce lien de partage a expiré." }, { status: 410 });
    }

    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const authorName = (formData.get("authorName") as string | null)?.trim() || null;
    const note = (formData.get("note") as string | null)?.trim() || null;

    if (files.length === 0) {
      return NextResponse.json({ error: "Aucun fichier fourni." }, { status: 400 });
    }

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

    const stored = await Promise.all(
      files.map((f) => storeFile(f, "share-contributions"))
    );
    const photoPaths = stored.map((s) => s.path);

    const contribution = await prisma.shareContribution.create({
      data: {
        shareId: share.id,
        authorName,
        photoPaths: JSON.stringify(photoPaths),
        note,
      },
    });

    logAudit("SHARE_CONTRIBUTION_PHOTOS", share.profileId, "product", share.productId, {
      shareId: share.id,
      contributionId: contribution.id,
      count: photoPaths.length,
    });

    return NextResponse.json({ success: true, id: contribution.id }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/share/[code]/photos]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
