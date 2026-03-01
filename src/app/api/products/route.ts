import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSKU, PRODUCT_FAMILIES, SEASONS, SIZE_RANGES } from "@/lib/utils";
import {
  MAX_NAME_LENGTH,
  MAX_REFERENCE_LENGTH,
  validateStringArray,
  validateMeasurements,
  isPrismaUniqueConflict,
} from "@/lib/validation";

export const dynamic = 'force-dynamic';

const VALID_FAMILIES = new Set<string>(PRODUCT_FAMILIES.map((f) => f.value));
const VALID_SEASONS = new Set<string>(SEASONS.map((s) => s.value));
const VALID_SIZE_RANGES = new Set<string>(SIZE_RANGES.map((s) => s.value));

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

  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "Nom requis" }, { status: 422 });
  }
  if ((body.name as string).trim().length > MAX_NAME_LENGTH) {
    return NextResponse.json({ error: `Nom trop long (max ${MAX_NAME_LENGTH} car.)` }, { status: 422 });
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
  if (!body.sizeRange || !VALID_SIZE_RANGES.has(body.sizeRange as string)) {
    return NextResponse.json({ error: "Gamme de tailles invalide" }, { status: 422 });
  }

  const sizes = validateStringArray(body.sizes ?? []);
  if (sizes === null) {
    return NextResponse.json({ error: "Tailles invalides" }, { status: 422 });
  }
  const materials = body.materials ? validateStringArray(body.materials) : null;
  if (body.materials && materials === null) {
    return NextResponse.json({ error: "Matériaux invalides" }, { status: 422 });
  }
  const colors = body.colors ? validateStringArray(body.colors) : null;
  if (body.colors && colors === null) {
    return NextResponse.json({ error: "Couleurs invalides" }, { status: 422 });
  }

  if (body.reference !== undefined && body.reference !== null) {
    if (typeof body.reference !== "string" || body.reference.length > MAX_REFERENCE_LENGTH) {
      return NextResponse.json({ error: `Référence invalide (max ${MAX_REFERENCE_LENGTH} car.)` }, { status: 422 });
    }
  }

  if (body.measurements !== undefined && body.measurements !== null) {
    if (validateMeasurements(body.measurements) === null) {
      return NextResponse.json({ error: "Mesures invalides" }, { status: 422 });
    }
  }

  // SKU generation with retry loop to handle race-condition on unique constraint
  for (let attempt = 0; attempt < 3; attempt++) {
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
        index: count + 1 + attempt,
      });

      const product = await prisma.product.create({
        data: {
          name: (body.name as string).trim(),
          sku,
          family: body.family as string,
          season: body.season as string,
          year,
          sizeRange: body.sizeRange as string,
          sizes: JSON.stringify(sizes),
          measurements: body.measurements ? JSON.stringify(body.measurements) : null,
          materials: materials ? JSON.stringify(materials) : null,
          colors: colors ? JSON.stringify(colors) : null,
          reference: typeof body.reference === "string" ? body.reference : null,
        },
      });

      return NextResponse.json(product, { status: 201 });
    } catch (err) {
      if (isPrismaUniqueConflict(err) && attempt < 2) continue;
      if (isPrismaUniqueConflict(err)) {
        return NextResponse.json(
          { error: "Conflit de référence SKU, veuillez réessayer" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
  }
  // unreachable — loop always returns
}
