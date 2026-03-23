import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeParseArray } from "@/lib/formatters";
import { rateLimitResponse, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Remap a stored path through the share-aware file proxy. */
function toShareProxyPath(code: string, storedPath: string): string {
  return `/api/share/${code}/file?path=${encodeURIComponent(storedPath)}`;
}

// GET /api/share/[code] — public: product info + contributions
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const limited = await rateLimitResponse(`share-get:${getClientIp(req)}`, "loose");
    if (limited) return limited;

    const { code } = await params;

    if (!code || code.length > 20) {
      return NextResponse.json({ error: "Lien de partage invalide." }, { status: 404 });
    }

    const share = await prisma.productShare.findUnique({
      where: { code },
      include: {
        product: true,
        contributions: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!share || !share.product || share.product.deletedAt !== null) {
      return NextResponse.json({ error: "Lien de partage invalide." }, { status: 404 });
    }

    if (share.expiresAt && share.expiresAt < new Date()) {
      return NextResponse.json({ error: "Ce lien de partage a expiré." }, { status: 410 });
    }

    const product = share.product;

    const sketchPaths = safeParseArray(product.sketchPaths).map((p) =>
      toShareProxyPath(code, p)
    );

    const contributions = share.contributions.map((c) => ({
      id: c.id,
      createdAt: c.createdAt,
      authorName: c.authorName,
      photoPaths: safeParseArray(c.photoPaths).map((p) => toShareProxyPath(code, p)),
      note: c.note,
    }));

    return NextResponse.json({
      share: {
        id: share.id,
        code: share.code,
        label: share.label,
        expiresAt: share.expiresAt,
      },
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        reference: product.reference,
        family: product.family,
        season: product.season,
        year: product.year,
        sizeRange: product.sizeRange,
        measurements: product.measurements,
        sketchPaths,
      },
      contributions,
    });
  } catch (error) {
    console.error("[GET /api/share/[code]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
