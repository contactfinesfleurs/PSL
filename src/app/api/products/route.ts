import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSKU, PRODUCT_FAMILIES, SEASONS } from "@/lib/utils";

export const dynamic = 'force-dynamic';

const VALID_FAMILIES = new Set<string>(PRODUCT_FAMILIES.map((f) => f.value));
const VALID_SEASONS = new Set<string>(SEASONS.map((s) => s.value));

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const family = searchParams.get("family");
  const season = searchParams.get("season");

  try {
    const products = await prisma.product.findMany({
      where: {
        ...(status ? { sampleStatus: status } : {}),
        ...(family ? { family } : {}),
        ...(season ? { season } : {}),
      },
      include: { samples: true, campaigns: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(products);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  // Required field validation
  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "Nom requis" }, { status: 422 });
  }
  if (!body.family || !VALID_FAMILIES.has(body.family as string)) {
    return NextResponse.json({ error: "Famille invalide" }, { status: 422 });
  }
  if (!body.season || !VALID_SEASONS.has(body.season as string)) {
    return NextResponse.json({ error: "Saison invalide" }, { status: 422 });
  }
  const year = Number(body.year);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "Année invalide" }, { status: 422 });
  }
  if (!body.sizeRange || typeof body.sizeRange !== "string") {
    return NextResponse.json({ error: "Gamme de tailles requise" }, { status: 422 });
  }

  try {
    const count = await prisma.product.count({
      where: {
        family: body.family as string,
        season: body.season as string,
        year,
      },
    });

    const sku = generateSKU({
      family: body.family as string,
      season: body.season as string,
      year,
      index: count + 1,
    });

    const product = await prisma.product.create({
      data: {
        name: (body.name as string).trim(),
        sku,
        family: body.family as string,
        season: body.season as string,
        year,
        sizeRange: body.sizeRange as string,
        sizes: JSON.stringify(Array.isArray(body.sizes) ? body.sizes : []),
        measurements: body.measurements ? JSON.stringify(body.measurements) : null,
        materials: body.materials ? JSON.stringify(body.materials) : null,
        colors: body.colors ? JSON.stringify(body.colors) : null,
        reference: typeof body.reference === "string" ? body.reference : null,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
