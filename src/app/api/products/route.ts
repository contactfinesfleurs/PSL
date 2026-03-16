import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { generateSKU, generateReference } from "@/lib/generators";
import { z } from "zod";
import { parseBodyJson, validateEnum, getProfileId, unauthorizedResponse, parsePagination } from "@/lib/api-helpers";
import { SAMPLE_STATUS_VALUES } from "@/lib/constants";
import { getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

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
    const limited = await rateLimitResponse(`products-list:${getClientIp(req)}`, "loose");
    if (limited) return limited;
    const profileId = getProfileId(req);
    if (!profileId) return unauthorizedResponse();

    const { searchParams } = new URL(req.url);
    const sampleStatus = validateEnum(searchParams.get("status"), SAMPLE_STATUS_VALUES);
    // Sanitize free-text filters: trim whitespace and enforce a max length
    // consistent with the schema (100 chars). This prevents unexpectedly large
    // strings reaching the database layer even though Prisma uses parameterized queries.
    const rawFamily = searchParams.get("family");
    const rawSeason = searchParams.get("season");
    const family = rawFamily ? rawFamily.trim().slice(0, 100) || undefined : undefined;
    const season = rawSeason ? rawSeason.trim().slice(0, 100) || undefined : undefined;
    const { skip, take, page, limit } = parsePagination(searchParams);
    // slim=1: skip sample relation — used by lightweight autocompletes (e.g. variant search)
    const slim = searchParams.get("slim") === "1";

    const where = {
      profileId,
      deletedAt: null,
      ...(sampleStatus !== undefined ? { sampleStatus } : {}),
      ...(family !== undefined ? { family } : {}),
      ...(season !== undefined ? { season } : {}),
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        // Only include the lightweight sample count needed for list display.
        // Deep relations (campaigns, events) are loaded on the detail route to avoid N+1.
        // slim=1 callers (e.g. variant autocomplete) skip this entirely.
        ...(!slim ? { include: { samples: true } } : {}),
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

    const colorCodes = [data.colorPrimary, data.colorSecondary].filter(Boolean) as string[];

    const reference = generateReference({
      name: data.name,
      season: data.season,
      year: data.year,
      material: data.materials?.[0] ?? null,
      colorPrimary: data.colorPrimary ?? null,
    });

    // Retry loop to handle SKU collisions caused by concurrent inserts.
    // Two simultaneous requests can produce the same count → same SKU → P2002.
    // Each retry increments the offset so it always finds an unused index.
    let product;
    for (let attempt = 0; attempt < 5; attempt++) {
      const count = await prisma.product.count({
        where: { profileId, family: data.family, season: data.season, year: data.year },
      });
      const sku = generateSKU({
        family: data.family,
        season: data.season,
        year: data.year,
        index: count + 1 + attempt,
      });
      try {
        product = await prisma.product.create({
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
        break; // success
      } catch (e) {
        // P2002 = unique constraint violation on sku — retry with next index
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002" && attempt < 4) {
          continue;
        }
        throw e;
      }
    }

    return NextResponse.json(product!, { status: 201 });
  } catch (error) {
    console.error('[POST /api/products]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
