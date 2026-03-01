import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PRODUCT_FAMILIES, SEASONS, SIZE_RANGES, SAMPLE_STATUSES } from "@/lib/utils";
import {
  MAX_NAME_LENGTH,
  MAX_TEXT_LENGTH,
  MAX_REFERENCE_LENGTH,
  MAX_PATH_LENGTH,
  isJsonObject,
  validateStringArray,
  validateMeasurements,
  isValidDate,
  isPrismaNotFound,
} from "@/lib/validation";

export const dynamic = 'force-dynamic';

const VALID_FAMILIES = new Set<string>(PRODUCT_FAMILIES.map((f) => f.value));
const VALID_SEASONS = new Set<string>(SEASONS.map((s) => s.value));
const VALID_SIZE_RANGES = new Set<string>(SIZE_RANGES.map((s) => s.value));
const VALID_SAMPLE_STATUSES = new Set<string>(SAMPLE_STATUSES.map((s) => s.value));

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        samples: true,
        campaigns: { include: { campaign: true } },
        events: { include: { event: true } },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    const raw: unknown = await req.json();
    if (!isJsonObject(raw)) return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
    body = raw;
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "Nom invalide" }, { status: 422 });
    }
    if (body.name.trim().length > MAX_NAME_LENGTH) {
      return NextResponse.json({ error: `Nom trop long (max ${MAX_NAME_LENGTH} car.)` }, { status: 422 });
    }
  }
  if (body.family !== undefined && (typeof body.family !== "string" || !VALID_FAMILIES.has(body.family))) {
    return NextResponse.json({ error: "Famille invalide" }, { status: 422 });
  }
  if (body.season !== undefined && (typeof body.season !== "string" || !VALID_SEASONS.has(body.season))) {
    return NextResponse.json({ error: "Saison invalide" }, { status: 422 });
  }
  if (body.sizeRange !== undefined && (typeof body.sizeRange !== "string" || !VALID_SIZE_RANGES.has(body.sizeRange))) {
    return NextResponse.json({ error: "Gamme de tailles invalide" }, { status: 422 });
  }
  if (body.sampleStatus !== undefined && (typeof body.sampleStatus !== "string" || !VALID_SAMPLE_STATUSES.has(body.sampleStatus))) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 422 });
  }
  if (body.year !== undefined) {
    const year = Number(body.year);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "Année invalide" }, { status: 422 });
    }
  }

  // sizes is required (non-nullable) — reject null
  if (body.sizes !== undefined) {
    if (body.sizes === null || validateStringArray(body.sizes) === null) {
      return NextResponse.json({ error: "Champ sizes invalide" }, { status: 422 });
    }
  }
  // nullable JSON array fields — allow null (clears the field)
  for (const field of ["materials", "colors", "sketchPaths", "metaTags"] as const) {
    if (body[field] !== undefined && body[field] !== null) {
      if (validateStringArray(body[field]) === null) {
        return NextResponse.json({ error: `Champ ${field} invalide` }, { status: 422 });
      }
    }
  }

  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== "string" || body.description.length > MAX_TEXT_LENGTH) {
      return NextResponse.json({ error: `Description trop longue (max ${MAX_TEXT_LENGTH} car.)` }, { status: 422 });
    }
  }
  if (body.reference !== undefined && body.reference !== null) {
    if (typeof body.reference !== "string" || body.reference.length > MAX_REFERENCE_LENGTH) {
      return NextResponse.json({ error: `Référence invalide (max ${MAX_REFERENCE_LENGTH} car.)` }, { status: 422 });
    }
  }
  if (body.techPackPath !== undefined && body.techPackPath !== null) {
    if (typeof body.techPackPath !== "string" || body.techPackPath.length > MAX_PATH_LENGTH) {
      return NextResponse.json({ error: "Chemin techPackPath invalide" }, { status: 422 });
    }
  }
  if (body.measurements !== undefined && body.measurements !== null) {
    if (validateMeasurements(body.measurements) === null) {
      return NextResponse.json({ error: "Mesures invalides" }, { status: 422 });
    }
  }
  if (body.plannedLaunchAt !== undefined && body.plannedLaunchAt !== null) {
    if (!isValidDate(body.plannedLaunchAt)) {
      return NextResponse.json({ error: "Date de lancement invalide" }, { status: 422 });
    }
  }

  try {
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: (body.name as string).trim() }),
        ...(body.family !== undefined && { family: body.family as string }),
        ...(body.season !== undefined && { season: body.season as string }),
        ...(body.year !== undefined && { year: Number(body.year) }),
        ...(body.sizeRange !== undefined && { sizeRange: body.sizeRange as string }),
        ...(body.sizes !== undefined && { sizes: JSON.stringify(body.sizes) }),
        ...(body.measurements !== undefined && { measurements: body.measurements != null ? JSON.stringify(body.measurements) : null }),
        ...(body.materials !== undefined && { materials: body.materials != null ? JSON.stringify(body.materials) : null }),
        ...(body.colors !== undefined && { colors: body.colors != null ? JSON.stringify(body.colors) : null }),
        ...(body.sketchPaths !== undefined && { sketchPaths: body.sketchPaths != null ? JSON.stringify(body.sketchPaths) : null }),
        ...(body.techPackPath !== undefined && { techPackPath: body.techPackPath as string | null }),
        ...(body.sampleStatus !== undefined && { sampleStatus: body.sampleStatus as string }),
        ...(body.description !== undefined && { description: body.description as string | null }),
        ...(body.metaTags !== undefined && { metaTags: body.metaTags != null ? JSON.stringify(body.metaTags) : null }),
        ...(body.plannedLaunchAt !== undefined && {
          plannedLaunchAt: body.plannedLaunchAt ? new Date(body.plannedLaunchAt as string) : null,
        }),
        ...(body.reference !== undefined && { reference: body.reference as string | null }),
      },
    });
    return NextResponse.json(product);
  } catch (err) {
    if (isPrismaNotFound(err)) {
      return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (isPrismaNotFound(err)) {
      return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
