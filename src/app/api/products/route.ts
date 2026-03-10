import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSKU, generateReference } from "@/lib/generators";
import { z } from "zod";
import { parseBodyJson, validateEnum, getProfileId, unauthorizedResponse, parsePagination } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

// ─── Enums ────────────────────────────────────────────────────────────────────

const SAMPLE_STATUSES = ["PENDING", "VALIDATED", "NOT_VALIDATED"] as const;

// ─── Schemas ──────────────────────────────────────────────────────────────────

const ProductCreateSchema = z.object({
  name: z.string().min(1).max(200),
  family: z.string().min(1).max(100),
  season: z.string().min(1).max(100),
  year: z.number().int().min(2000).max(2100),
  sizeRange: z.string().min(1).max(100),
  sizes: z.array(z.string().max(20)).optional().default([]),
  measurements: z.string().nullable().optional(),
  materials: z.array(z.string().max(200)).optional().nullable(),
  colorPrimary: z.string().max(10).optional().nullable(),
  colorSecondary: z.string().max(10).optional().nullable(),
});

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const profileId = getProfileId(req);
    if (!profileId) return unauthorizedResponse();

    const { searchParams } = new URL(req.url);
    const sampleStatus = validateEnum(searchParams.get("status"), SAMPLE_STATUSES);
    const family = searchParams.get("family");
    const season = searchParams.get("season");
    const { skip, take, page, limit } = parsePagination(searchParams);

    const where = {
      profileId,
      deletedAt: null,
      ...(sampleStatus ? { sampleStatus } : {}),
      ...(family ? { family } : {}),
      ...(season ? { season } : {}),
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        // Only include the lightweight sample count needed for list display.
        // Deep relations (campaigns, events) are loaded on the detail route to avoid N+1.
        include: { samples: true },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      data: products,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[GET /api/products]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const profileId = getProfileId(req);
    if (!profileId) return unauthorizedResponse();

    const result = await parseBodyJson(req, ProductCreateSchema);
    if (!result.success) return result.response;
    const data = result.data;

    // Count existing products in this family+season+year to generate index
    const count = await prisma.product.count({
      where: { profileId, family: data.family, season: data.season, year: data.year },
    });

    const sku = generateSKU({
      family: data.family,
      season: data.season,
      year: data.year,
      index: count + 1,
    });

    const colorCodes = [data.colorPrimary, data.colorSecondary].filter(Boolean) as string[];

    const reference = generateReference({
      name: data.name,
      season: data.season,
      year: data.year,
      material: data.materials?.[0] ?? null,
      colorPrimary: data.colorPrimary ?? null,
    });

    const product = await prisma.product.create({
      data: {
        profileId,
        name: data.name,
        sku,
        reference,
        family: data.family,
        season: data.season,
        year: data.year,
        sizeRange: data.sizeRange,
        sizes: JSON.stringify(data.sizes),
        measurements: data.measurements ?? null,
        materials: data.materials ? JSON.stringify(data.materials) : null,
        colors: colorCodes.length > 0 ? JSON.stringify(colorCodes) : null,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('[POST /api/products]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
