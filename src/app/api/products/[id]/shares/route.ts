import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseBodyJson, getProfileId, unauthorizedResponse } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";
import { getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// 16 URL-safe alphanumeric characters — ~95 bits of entropy (log2(62^16))
// Uses Web Crypto (crypto.getRandomValues) available in all Next.js runtimes.
function generateShareCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes).map((b) => chars[b % chars.length]).join("");
}

const CreateShareSchema = z.object({
  label: z.string().max(200).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

// GET /api/products/[id]/shares — list share codes for a product (owner only)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const limited = await rateLimitResponse(`shares:${getClientIp(req)}`, "loose");
    if (limited) return limited;
    const profileId = getProfileId(req);
    if (!profileId) return unauthorizedResponse();

    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id, profileId, deletedAt: null },
    });
    if (!product) {
      return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
    }

    const shares = await prisma.productShare.findMany({
      where: { productId: id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { contributions: true } } },
    });

    return NextResponse.json(shares);
  } catch (error) {
    console.error("[GET /api/products/[id]/shares]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/products/[id]/shares — create a share code (owner only)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profileId = getProfileId(req);
    if (!profileId) return unauthorizedResponse();

    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id, profileId, deletedAt: null },
    });
    if (!product) {
      return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
    }

    const result = await parseBodyJson(req, CreateShareSchema);
    if (!result.success) return result.response;
    const body = result.data;

    const share = await prisma.productShare.create({
      data: {
        code: generateShareCode(),
        productId: id,
        profileId,
        label: body.label ?? null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
    });

    logAudit("SHARE_CREATE", profileId, "product", id, {
      shareId: share.id,
      code: share.code,
    });

    return NextResponse.json(share, { status: 201 });
  } catch (error) {
    console.error("[POST /api/products/[id]/shares]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
