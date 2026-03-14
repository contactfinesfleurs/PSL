import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isStoredPath,
  isVercelBlobHostname,
  fetchBlobContent,
  UPLOADS_ROOT,
  MIME_BY_EXT,
} from "@/lib/storage";
import { safeParseArray } from "@/lib/formatters";
import { readFile } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * Public file proxy for share pages.
 *
 * Validates:
 *   1. Share code is valid and not expired
 *   2. Requested path belongs to the product's sketches OR a contribution of this share
 *
 * Then proxies the file. External users never receive raw blob URLs.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const requestedPath = req.nextUrl.searchParams.get("path");

    if (!requestedPath || !isStoredPath(requestedPath)) {
      return NextResponse.json({ error: "Chemin invalide." }, { status: 400 });
    }

    const share = await prisma.productShare.findUnique({
      where: { code },
      include: {
        product: true,
        contributions: { select: { photoPaths: true } },
      },
    });

    if (!share || !share.product || share.product.deletedAt !== null) {
      return NextResponse.json({ error: "Lien de partage invalide." }, { status: 404 });
    }

    if (share.expiresAt && share.expiresAt < new Date()) {
      return NextResponse.json({ error: "Ce lien de partage a expiré." }, { status: 410 });
    }

    // Build the set of paths this share is authorized to serve
    const productPaths = safeParseArray(share.product.sketchPaths);
    const contributionPaths = share.contributions.flatMap((c) =>
      safeParseArray(c.photoPaths)
    );
    const authorizedPaths = new Set([...productPaths, ...contributionPaths]);

    if (!authorizedPaths.has(requestedPath)) {
      return NextResponse.json({ error: "Fichier non autorisé." }, { status: 403 });
    }

    // ── Serve via Vercel Blob (production) ───────────────────────────────────
    if (requestedPath.startsWith("/api/blob?url=")) {
      const encoded = requestedPath.slice("/api/blob?url=".length);
      const blobUrl = decodeURIComponent(encoded);

      if (!isVercelBlobHostname(blobUrl)) {
        return NextResponse.json({ error: "URL non autorisée." }, { status: 403 });
      }

      const result = await fetchBlobContent(blobUrl);
      if (!result.ok) {
        return NextResponse.json({ error: "Fichier introuvable." }, { status: result.status });
      }
      if (result.statusCode === 304 || !result.stream) {
        return new NextResponse(null, { status: 304 });
      }

      return new NextResponse(result.stream, {
        headers: {
          "Content-Type": result.contentType,
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "private, max-age=3600",
        },
      });
    }

    // ── Serve from local filesystem (development) ────────────────────────────
    if (requestedPath.startsWith("/api/files/")) {
      const relative = requestedPath.slice("/api/files/".length);
      const resolved = path.resolve(UPLOADS_ROOT, relative);

      if (!resolved.startsWith(UPLOADS_ROOT + path.sep)) {
        return NextResponse.json({ error: "Chemin invalide." }, { status: 400 });
      }

      const ext = path.extname(resolved).slice(1).toLowerCase();
      const contentType = MIME_BY_EXT[ext];
      if (!contentType) {
        return NextResponse.json({ error: "Type de fichier non autorisé." }, { status: 415 });
      }

      try {
        const buffer = await readFile(resolved);
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": contentType,
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, max-age=3600",
          },
        });
      } catch {
        return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
      }
    }

    return NextResponse.json({ error: "Chemin invalide." }, { status: 400 });
  } catch (error) {
    console.error("[GET /api/share/[code]/file]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
