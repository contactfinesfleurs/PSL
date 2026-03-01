import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PRODUCT_FAMILIES, SEASONS, SIZE_RANGES } from "@/lib/utils";
import { Prisma } from "@prisma/client";

export const dynamic = 'force-dynamic';

const VALID_FAMILIES = new Set<string>(PRODUCT_FAMILIES.map((f) => f.value));
const VALID_SEASONS = new Set<string>(SEASONS.map((s) => s.value));
const VALID_SIZE_RANGES = new Set<string>(SIZE_RANGES.map((s) => s.value));
const VALID_SAMPLE_STATUSES = new Set<string>(["PENDING", "VALIDATED", "NOT_VALIDATED"]);

const MAX_NAME_LENGTH = 200;
const MAX_TEXT_LENGTH = 5000;
const MAX_ARRAY_ITEMS = 50;
const MAX_ARRAY_ITEM_LENGTH = 100;

function validateStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  if (value.length > MAX_ARRAY_ITEMS) return null;
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") return null;
    if (item.length > MAX_ARRAY_ITEM_LENGTH) return null;
    result.push(item);
  }
  return result;
}

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
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  // Name validation
  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "Nom invalide" }, { status: 422 });
    }
    if (body.name.trim().length > MAX_NAME_LENGTH) {
      return NextResponse.json({ error: `Nom trop long (max ${MAX_NAME_LENGTH} car.)` }, { status: 422 });
    }
  }

  // Enum validation
  if (body.family !== undefined && !VALID_FAMILIES.has(body.family as string)) {
    return NextResponse.json({ error: "Famille invalide" }, { status: 422 });
  }
  if (body.season !== undefined && !VALID_SEASONS.has(body.season as string)) {
    return NextResponse.json({ error: "Saison invalide" }, { status: 422 });
  }
  if (body.sizeRange !== undefined && !VALID_SIZE_RANGES.has(body.sizeRange as string)) {
    return NextResponse.json({ error: "Gamme de tailles invalide" }, { status: 422 });
  }
  if (
    body.sampleStatus !== undefined &&
    !VALID_SAMPLE_STATUSES.has(body.sampleStatus as string)
  ) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 422 });
  }
  if (body.year !== undefined) {
    const year = Number(body.year);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "Année invalide" }, { status: 422 });
    }
  }

  // Array validation
  if (body.sizes !== undefined) {
    if (validateStringArray(body.sizes) === null) {
      return NextResponse.json({ error: "Tailles invalides" }, { status: 422 });
    }
  }
  if (body.materials !== undefined && body.materials !== null) {
    if (validateStringArray(body.materials) === null) {
      return NextResponse.json({ error: "Matériaux invalides" }, { status: 422 });
    }
  }
  if (body.colors !== undefined && body.colors !== null) {
    if (validateStringArray(body.colors) === null) {
      return NextResponse.json({ error: "Couleurs invalides" }, { status: 422 });
    }
  }
  if (body.sketchPaths !== undefined && body.sketchPaths !== null) {
    if (validateStringArray(body.sketchPaths) === null) {
      return NextResponse.json({ error: "Chemins de croquis invalides" }, { status: 422 });
    }
  }
  if (body.metaTags !== undefined && body.metaTags !== null) {
    if (validateStringArray(body.metaTags) === null) {
      return NextResponse.json({ error: "Tags invalides" }, { status: 422 });
    }
  }

  // Text length limits
  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== "string" || body.description.length > MAX_TEXT_LENGTH) {
      return NextResponse.json({ error: `Description trop longue (max ${MAX_TEXT_LENGTH} car.)` }, { status: 422 });
    }
  }
  if (body.reference !== undefined && body.reference !== null) {
    if (typeof body.reference !== "string" || body.reference.length > 100) {
      return NextResponse.json({ error: "Référence invalide" }, { status: 422 });
    }
  }

  // Date validation
  if (body.plannedLaunchAt !== undefined && body.plannedLaunchAt !== null) {
    const d = new Date(body.plannedLaunchAt as string);
    if (isNaN(d.getTime())) {
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
        ...(body.measurements !== undefined && {
          measurements: JSON.stringify(body.measurements),
        }),
        ...(body.materials !== undefined && {
          materials: JSON.stringify(body.materials),
        }),
        ...(body.colors !== undefined && { colors: JSON.stringify(body.colors) }),
        ...(body.sketchPaths !== undefined && {
          sketchPaths: JSON.stringify(body.sketchPaths),
        }),
        ...(body.techPackPath !== undefined && {
          techPackPath: body.techPackPath as string | null,
        }),
        ...(body.sampleStatus !== undefined && {
          sampleStatus: body.sampleStatus as string,
        }),
        ...(body.description !== undefined && {
          description: body.description as string | null,
        }),
        ...(body.metaTags !== undefined && {
          metaTags: JSON.stringify(body.metaTags),
        }),
        ...(body.plannedLaunchAt !== undefined && {
          plannedLaunchAt: body.plannedLaunchAt
            ? new Date(body.plannedLaunchAt as string)
            : null,
        }),
        ...(body.reference !== undefined && {
          reference: body.reference as string | null,
        }),
      },
    });
    return NextResponse.json(product);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
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
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
