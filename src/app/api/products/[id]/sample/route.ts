import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  MAX_NOTES_LENGTH,
  isJsonObject,
  validateStringArray,
  validatePathArray,
  isPrismaFKViolation,
  isPrismaNotFound,
} from "@/lib/validation";

export const dynamic = 'force-dynamic';

/** Validate all photo/string array fields from a request body. Returns an error response or null. */
function validateSampleBody(body: Record<string, unknown>): NextResponse | null {
  if (body.reviewNotes !== undefined && body.reviewNotes !== null) {
    if (typeof body.reviewNotes !== "string" || body.reviewNotes.length > MAX_NOTES_LENGTH) {
      return NextResponse.json({ error: `Notes trop longues (max ${MAX_NOTES_LENGTH} car.)` }, { status: 422 });
    }
  }
  for (const field of ["samplePhotoPaths", "detailPhotoPaths", "reviewPhotoPaths", "packshotPaths"] as const) {
    if (body[field] !== undefined && body[field] !== null && validatePathArray(body[field]) === null) {
      return NextResponse.json({ error: `${field} invalide` }, { status: 422 });
    }
  }
  for (const field of ["definitiveColors", "definitiveMaterials"] as const) {
    if (body[field] !== undefined && body[field] !== null && validateStringArray(body[field]) === null) {
      return NextResponse.json({ error: `${field} invalide` }, { status: 422 });
    }
  }
  return null;
}

/** Build the Prisma data object for sample fields (partial update). */
function buildSampleUpdate(body: Record<string, unknown>) {
  return {
    ...(body.samplePhotoPaths !== undefined && {
      samplePhotoPaths: body.samplePhotoPaths != null ? JSON.stringify(body.samplePhotoPaths) : null,
    }),
    ...(body.detailPhotoPaths !== undefined && {
      detailPhotoPaths: body.detailPhotoPaths != null ? JSON.stringify(body.detailPhotoPaths) : null,
    }),
    ...(body.reviewPhotoPaths !== undefined && {
      reviewPhotoPaths: body.reviewPhotoPaths != null ? JSON.stringify(body.reviewPhotoPaths) : null,
    }),
    ...(body.reviewNotes !== undefined && {
      reviewNotes: typeof body.reviewNotes === "string" ? body.reviewNotes : null,
    }),
    ...(body.packshotPaths !== undefined && {
      packshotPaths: body.packshotPaths != null ? JSON.stringify(body.packshotPaths) : null,
    }),
    ...(body.definitiveColors !== undefined && {
      definitiveColors: body.definitiveColors != null ? JSON.stringify(body.definitiveColors) : null,
    }),
    ...(body.definitiveMaterials !== undefined && {
      definitiveMaterials: body.definitiveMaterials != null ? JSON.stringify(body.definitiveMaterials) : null,
    }),
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const sample = await prisma.sample.findFirst({ where: { productId: id } });
    return NextResponse.json(sample ?? null);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/** PUT: update an existing sample by sampleId. */
export async function PUT(
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

  const validationError = validateSampleBody(body);
  if (validationError) return validationError;

  // Normalise sampleId: only accept non-empty strings (falsy/empty bypasses IDOR check)
  const sampleId = typeof body.sampleId === "string" && body.sampleId ? body.sampleId : null;

  try {
    // IDOR: verify sampleId belongs to this product before upsert
    if (sampleId) {
      const existing = await prisma.sample.findUnique({
        where: { id: sampleId },
        select: { productId: true },
      });
      if (!existing || existing.productId !== id) {
        return NextResponse.json({ error: "Prototype introuvable" }, { status: 404 });
      }
    }

    const sample = await prisma.sample.upsert({
      where: { id: sampleId ?? "new" },
      create: { productId: id, ...buildSampleUpdate(body) },
      update: buildSampleUpdate(body),
    });

    return NextResponse.json(sample);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/** POST: create or update the sample for a product (no sampleId required). */
export async function POST(
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

  const validationError = validateSampleBody(body);
  if (validationError) return validationError;

  try {
    // Find existing sample by productId (no unique constraint → can't use upsert directly)
    const existing = await prisma.sample.findFirst({ where: { productId: id } });

    if (existing) {
      const updated = await prisma.sample.update({
        where: { id: existing.id },
        data: buildSampleUpdate(body),
      });
      return NextResponse.json(updated);
    }

    // No existing sample — create one (FK error caught below if product doesn't exist)
    const sample = await prisma.sample.create({
      data: {
        productId: id,
        ...buildSampleUpdate(body),
      },
    });
    return NextResponse.json(sample, { status: 201 });
  } catch (err) {
    if (isPrismaFKViolation(err) || isPrismaNotFound(err)) {
      return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
