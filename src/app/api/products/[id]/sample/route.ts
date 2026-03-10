import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseBodyJson, getProfileId, unauthorizedResponse } from "@/lib/api-helpers";

export const dynamic = 'force-dynamic';

const SampleUpsertSchema = z.object({
  sampleId: z.string().optional(),
  samplePhotoPaths: z.array(z.string()).nullable().optional(),
  detailPhotoPaths: z.array(z.string()).nullable().optional(),
  reviewPhotoPaths: z.array(z.string()).nullable().optional(),
  reviewNotes: z.string().nullable().optional(),
  supplierName: z.string().nullable().optional(),
  supplierAddress: z.string().nullable().optional(),
  supplierCountry: z.string().nullable().optional(),
  shippingDate: z.string().datetime().nullable().optional(),
  trackingNumber: z.string().nullable().optional(),
  packshotPaths: z.array(z.string()).nullable().optional(),
  definitiveColors: z.array(z.string()).nullable().optional(),
  definitiveMaterials: z.array(z.string()).nullable().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profileId = getProfileId(req);
  if (!profileId) return unauthorizedResponse();

  const { id } = await params;

  // Verify product ownership
  const product = await prisma.product.findFirst({
    where: { id, profileId, deletedAt: null },
  });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sample = await prisma.sample.findFirst({
    where: { productId: id },
  });
  return NextResponse.json(sample ?? null);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profileId = getProfileId(req);
  if (!profileId) return unauthorizedResponse();

  const { id } = await params;

  // Verify product ownership
  const product = await prisma.product.findFirst({
    where: { id, profileId, deletedAt: null },
  });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await parseBodyJson(req, SampleUpsertSchema);
  if (!result.success) return result.response;
  const body = result.data;

  const sample = await prisma.sample.upsert({
    where: {
      id: body.sampleId ?? "new",
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
      reviewNotes: body.reviewNotes ?? null,
      supplierName: body.supplierName ?? null,
      supplierAddress: body.supplierAddress ?? null,
      supplierCountry: body.supplierCountry ?? null,
      shippingDate: body.shippingDate ? new Date(body.shippingDate) : null,
      trackingNumber: body.trackingNumber ?? null,
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
      ...(body.supplierName !== undefined && { supplierName: body.supplierName }),
      ...(body.supplierAddress !== undefined && { supplierAddress: body.supplierAddress }),
      ...(body.supplierCountry !== undefined && { supplierCountry: body.supplierCountry }),
      ...(body.shippingDate !== undefined && {
        shippingDate: body.shippingDate ? new Date(body.shippingDate) : null,
      }),
      ...(body.trackingNumber !== undefined && { trackingNumber: body.trackingNumber }),
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
  { params }: { params: Promise<{ id: string }> }
) {
  const profileId = getProfileId(req);
  if (!profileId) return unauthorizedResponse();

  const { id } = await params;

  // Verify product ownership
  const product = await prisma.product.findFirst({
    where: { id, profileId, deletedAt: null },
  });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await parseBodyJson(req, SampleUpsertSchema);
  if (!result.success) return result.response;
  const body = result.data;

  // Check if sample already exists
  const existing = await prisma.sample.findFirst({
    where: { productId: id },
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
        ...(body.supplierName !== undefined && { supplierName: body.supplierName }),
        ...(body.supplierAddress !== undefined && { supplierAddress: body.supplierAddress }),
        ...(body.supplierCountry !== undefined && { supplierCountry: body.supplierCountry }),
        ...(body.shippingDate !== undefined && {
          shippingDate: body.shippingDate ? new Date(body.shippingDate) : null,
        }),
        ...(body.trackingNumber !== undefined && { trackingNumber: body.trackingNumber }),
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
      reviewNotes: body.reviewNotes ?? null,
      supplierName: body.supplierName ?? null,
      supplierAddress: body.supplierAddress ?? null,
      supplierCountry: body.supplierCountry ?? null,
      shippingDate: body.shippingDate ? new Date(body.shippingDate) : null,
      trackingNumber: body.trackingNumber ?? null,
    },
  });

  return NextResponse.json(sample, { status: 201 });
}
