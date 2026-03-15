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
    const [products, placements, contributions] = await Promise.all([
      prisma.product.findMany({
        where: { profileId: session.profileId },
        select: { sketchPaths: true, techPackPath: true },
      }),
      prisma.mediaPlacement.findMany({
        where: { product: { profileId: session.profileId } },
        select: { screenshotPath: true },
      }),
      prisma.projectContribution.findMany({
        where: { profileId: session.profileId },
        select: { photoPaths: true },
      }),
    ]);

    // Build the list of file paths to delete
    const filesToDelete: string[] = [];
    for (const p of products) {
      for (const path of safeParseArray(p.sketchPaths)) filesToDelete.push(path);
      if (p.techPackPath) filesToDelete.push(p.techPackPath);
    }
    for (const pl of placements) {
      if (pl.screenshotPath) filesToDelete.push(pl.screenshotPath);
    }
    for (const c of contributions) {
      for (const path of safeParseArray(c.photoPaths)) filesToDelete.push(path);
    }

    // Delete files and then the profile (cascade removes all DB records)
    await Promise.all(filesToDelete.map(deleteStoredFile));

    await prisma.profile.delete({ where: { id: session.profileId } });
    await clearSessionCookie();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/auth/me]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
