import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSKU } from "@/lib/utils";
import { z } from "zod";

export const dynamic = "force-dynamic";

// ─── Validation schemas ────────────────────────────────────────────────────

const SAMPLE_STATUSES = ["PENDING", "IN_PROGRESS", "VALIDATED", "REJECTED"] as const;
const PRODUCT_FAMILIES = [
  "ACCESSORIES", "PRET_A_PORTER", "SHOES", "LEATHER_GOODS", "JEWELRY", "FRAGRANCE",
] as const;
const SEASONS = ["FALL_WINTER", "PRE_COLLECTION", "SPRING_SUMMER", "CRUISE", "RESORT"] as const;

const ProductCreateSchema = z.object({
  name: z.string().min(1).max(200),
  family: z.string().min(1).max(100),
  season: z.string().min(1).max(100),
  year: z.number().int().min(2000).max(2100),
  sizeRange: z.string().min(1).max(100),
  sizes: z.array(z.string().max(20)).optional().default([]),
  measurements: z.record(z.string(), z.unknown()).optional().nullable(),
  materials: z.array(z.string().max(200)).optional().nullable(),
  colors: z.array(z.string().max(100)).optional().nullable(),
  reference: z.string().max(200).optional().nullable(),
});

// ─── Handlers ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawStatus = searchParams.get("status");
  const family = searchParams.get("family");
  const season = searchParams.get("season");

  // Validate enum query param — reject unknown values instead of unsafe cast
  const sampleStatus =
    rawStatus && (SAMPLE_STATUSES as readonly string[]).includes(rawStatus)
      ? (rawStatus as (typeof SAMPLE_STATUSES)[number])
      : undefined;

  const products = await prisma.product.findMany({
    where: {
      ...(sampleStatus ? { sampleStatus } : {}),
      ...(family ? { family } : {}),
      ...(season ? { season } : {}),
    },
    include: { samples: true, campaigns: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête JSON invalide." }, { status: 400 });
  }

  const parsed = ProductCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides.", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const data = parsed.data;

  // Count existing products in this family+season+year to generate index
  const count = await prisma.product.count({
    where: { family: data.family, season: data.season, year: data.year },
  });

  const sku = generateSKU({
    family: data.family,
    season: data.season,
    year: data.year,
    index: count + 1,
  });

  const product = await prisma.product.create({
    data: {
      name: data.name,
      sku,
      family: data.family,
      season: data.season,
      year: data.year,
      sizeRange: data.sizeRange,
      sizes: JSON.stringify(data.sizes),
      measurements: data.measurements ? JSON.stringify(data.measurements) : null,
      materials: data.materials ? JSON.stringify(data.materials) : null,
      colors: data.colors ? JSON.stringify(data.colors) : null,
      reference: data.reference ?? null,
    },
  });

  return NextResponse.json(product, { status: 201 });
}
