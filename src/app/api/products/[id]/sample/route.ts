import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const sample = await prisma.sample.findFirst({
      where: { productId: id },
    });
    return NextResponse.json(sample ?? null);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(
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

  try {
    // IDOR fix: if sampleId is provided, verify it belongs to this product
    if (body.sampleId && typeof body.sampleId === "string") {
      const existing = await prisma.sample.findUnique({
        where: { id: body.sampleId },
        select: { productId: true },
      });
      if (!existing || existing.productId !== id) {
        return NextResponse.json({ error: "Sample introuvable" }, { status: 404 });
      }
    }

    const sample = await prisma.sample.upsert({
      where: {
        id: typeof body.sampleId === "string" ? body.sampleId : "new",
      },
      create: {
        productId: id,
        samplePhotoPaths: body.samplePhotoPaths
          ? JSON.stringify(body.samplePhotoPaths)
          : null,
        detailPhotoPaths: body.detailPhotoPaths
          ? JSON.stringify(body.detailPhotoPaths)
          : null,
        reviewPhotoPaths: body.reviewPhotoPaths
          ? JSON.stringify(body.reviewPhotoPaths)
          : null,
        reviewNotes: typeof body.reviewNotes === "string" ? body.reviewNotes : null,
        packshotPaths: body.packshotPaths
          ? JSON.stringify(body.packshotPaths)
          : null,
        definitiveColors: body.definitiveColors
          ? JSON.stringify(body.definitiveColors)
          : null,
        definitiveMaterials: body.definitiveMaterials
          ? JSON.stringify(body.definitiveMaterials)
          : null,
      },
      update: {
        ...(body.samplePhotoPaths !== undefined && {
          samplePhotoPaths: JSON.stringify(body.samplePhotoPaths),
        }),
        ...(body.detailPhotoPaths !== undefined && {
          detailPhotoPaths: JSON.stringify(body.detailPhotoPaths),
        }),
        ...(body.reviewPhotoPaths !== undefined && {
          reviewPhotoPaths: JSON.stringify(body.reviewPhotoPaths),
        }),
        ...(body.reviewNotes !== undefined && {
          reviewNotes: typeof body.reviewNotes === "string" ? body.reviewNotes : null,
        }),
        ...(body.packshotPaths !== undefined && {
          packshotPaths: JSON.stringify(body.packshotPaths),
        }),
        ...(body.definitiveColors !== undefined && {
          definitiveColors: JSON.stringify(body.definitiveColors),
        }),
        ...(body.definitiveMaterials !== undefined && {
          definitiveMaterials: JSON.stringify(body.definitiveMaterials),
        }),
      },
    });

    return NextResponse.json(sample);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// Dedicated POST for creating a new sample if none exists
export async function POST(
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

  try {
    // Verify product exists
    const product = await prisma.product.findUnique({ where: { id }, select: { id: true } });
    if (!product) {
      return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
    }

    const existing = await prisma.sample.findFirst({ where: { productId: id } });

    if (existing) {
      const updated = await prisma.sample.update({
        where: { id: existing.id },
        data: {
          ...(body.samplePhotoPaths !== undefined && {
            samplePhotoPaths: JSON.stringify(body.samplePhotoPaths),
          }),
          ...(body.detailPhotoPaths !== undefined && {
            detailPhotoPaths: JSON.stringify(body.detailPhotoPaths),
          }),
          ...(body.reviewPhotoPaths !== undefined && {
            reviewPhotoPaths: JSON.stringify(body.reviewPhotoPaths),
          }),
          ...(body.reviewNotes !== undefined && {
            reviewNotes: typeof body.reviewNotes === "string" ? body.reviewNotes : null,
          }),
          ...(body.packshotPaths !== undefined && {
            packshotPaths: JSON.stringify(body.packshotPaths),
          }),
          ...(body.definitiveColors !== undefined && {
            definitiveColors: JSON.stringify(body.definitiveColors),
          }),
          ...(body.definitiveMaterials !== undefined && {
            definitiveMaterials: JSON.stringify(body.definitiveMaterials),
          }),
        },
      });
      return NextResponse.json(updated);
    }

    const sample = await prisma.sample.create({
      data: {
        productId: id,
        samplePhotoPaths: body.samplePhotoPaths
          ? JSON.stringify(body.samplePhotoPaths)
          : null,
        detailPhotoPaths: body.detailPhotoPaths
          ? JSON.stringify(body.detailPhotoPaths)
          : null,
        reviewPhotoPaths: body.reviewPhotoPaths
          ? JSON.stringify(body.reviewPhotoPaths)
          : null,
        reviewNotes: typeof body.reviewNotes === "string" ? body.reviewNotes : null,
      },
    });

    return NextResponse.json(sample, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
