import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PRODUCT_FAMILIES, SEASONS } from "@/lib/utils";

export const dynamic = 'force-dynamic';

const VALID_FAMILIES = new Set<string>(PRODUCT_FAMILIES.map((f) => f.value));
const VALID_SEASONS = new Set<string>(SEASONS.map((s) => s.value));
const VALID_SAMPLE_STATUSES = new Set<string>(["PENDING", "VALIDATED", "NOT_VALIDATED"]);

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

  // Enum validation for fields that have allowed values
  if (body.family !== undefined && !VALID_FAMILIES.has(body.family as string)) {
    return NextResponse.json({ error: "Famille invalide" }, { status: 422 });
  }
  if (body.season !== undefined && !VALID_SEASONS.has(body.season as string)) {
    return NextResponse.json({ error: "Saison invalide" }, { status: 422 });
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

  try {
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(body.name !== undefined && {
          name: typeof body.name === "string" ? body.name.trim() : String(body.name),
        }),
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
  } catch {
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
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
