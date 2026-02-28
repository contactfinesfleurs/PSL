import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sample = await prisma.sample.findFirst({
    where: { productId: params.id },
  });
  return NextResponse.json(sample ?? null);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();

  const sample = await prisma.sample.upsert({
    where: {
      // Use findFirst pattern via update or create
      id: body.sampleId ?? "new",
    },
    create: {
      productId: params.id,
      samplePhotoPaths: body.samplePhotoPaths
        ? JSON.stringify(body.samplePhotoPaths)
        : null,
      detailPhotoPaths: body.detailPhotoPaths
        ? JSON.stringify(body.detailPhotoPaths)
        : null,
      reviewPhotoPaths: body.reviewPhotoPaths
        ? JSON.stringify(body.reviewPhotoPaths)
        : null,
      reviewNotes: body.reviewNotes ?? null,
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
      ...(body.reviewNotes !== undefined && { reviewNotes: body.reviewNotes }),
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
}

// Dedicated POST for creating a new sample if none exists
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();

  // Check if sample already exists
  const existing = await prisma.sample.findFirst({
    where: { productId: params.id },
  });

  if (existing) {
    // Update instead
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
        ...(body.reviewNotes !== undefined && { reviewNotes: body.reviewNotes }),
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
      productId: params.id,
      samplePhotoPaths: body.samplePhotoPaths
        ? JSON.stringify(body.samplePhotoPaths)
        : null,
      detailPhotoPaths: body.detailPhotoPaths
        ? JSON.stringify(body.detailPhotoPaths)
        : null,
      reviewPhotoPaths: body.reviewPhotoPaths
        ? JSON.stringify(body.reviewPhotoPaths)
        : null,
      reviewNotes: body.reviewNotes ?? null,
    },
  });

  return NextResponse.json(sample, { status: 201 });
}
