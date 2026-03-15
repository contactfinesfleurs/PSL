import { NextResponse } from "next/server";
import { getSession, clearSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { deleteStoredFile } from "@/lib/storage";
import { safeParseArray } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    return NextResponse.json({
      profileId: session.profileId,
      name: session.name,
      email: session.email,
    });
  } catch (error) {
    console.error('[GET /api/auth/me]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/auth/me — RGPD right to erasure: permanently delete the account
// and all associated data (cascaded by Prisma schema).
export async function DELETE() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    logAudit("ACCOUNT_DELETE", session.profileId, "profile", session.profileId);

    // Collect all stored files belonging to the profile before deletion
    const [products, samples, placements, projectContributions, shareContributions] = await Promise.all([
      prisma.product.findMany({
        where: { profileId: session.profileId },
        select: { sketchPaths: true, techPackPath: true },
      }),
      prisma.sample.findMany({
        where: { product: { profileId: session.profileId } },
        select: {
          samplePhotoPaths: true,
          detailPhotoPaths: true,
          reviewPhotoPaths: true,
          packshotPaths: true,
        },
      }),
      prisma.mediaPlacement.findMany({
        where: { product: { profileId: session.profileId } },
        select: { screenshotPath: true },
      }),
      prisma.projectContribution.findMany({
        where: { profileId: session.profileId },
        select: { photoPaths: true },
      }),
      prisma.shareContribution.findMany({
        where: { share: { profileId: session.profileId } },
        select: { photoPaths: true },
      }),
    ]);

    // Build the list of file paths to delete
    const filesToDelete: string[] = [];
    for (const p of products) {
      for (const path of safeParseArray(p.sketchPaths)) filesToDelete.push(path);
      if (p.techPackPath) filesToDelete.push(p.techPackPath);
    }
    for (const s of samples) {
      for (const path of safeParseArray(s.samplePhotoPaths)) filesToDelete.push(path);
      for (const path of safeParseArray(s.detailPhotoPaths)) filesToDelete.push(path);
      for (const path of safeParseArray(s.reviewPhotoPaths)) filesToDelete.push(path);
      for (const path of safeParseArray(s.packshotPaths)) filesToDelete.push(path);
    }
    for (const pl of placements) {
      if (pl.screenshotPath) filesToDelete.push(pl.screenshotPath);
    }
    for (const c of projectContributions) {
      for (const path of safeParseArray(c.photoPaths)) filesToDelete.push(path);
    }
    for (const sc of shareContributions) {
      for (const path of safeParseArray(sc.photoPaths)) filesToDelete.push(path);
    }

    // Delete files gracefully — a missing or already-deleted file must not
    // block account deletion.
    await Promise.allSettled(filesToDelete.map(deleteStoredFile));

    await prisma.profile.delete({ where: { id: session.profileId } });
    await clearSessionCookie();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/auth/me]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
