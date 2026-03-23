import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseBodyJson, getProfileId, unauthorizedResponse } from "@/lib/api-helpers";
import { deleteStoredFile, isStoredPath } from "@/lib/storage";
import { safeParseArray } from "@/lib/formatters";

export const dynamic = 'force-dynamic';

const storedPathArray = z.array(z.string().refine(isStoredPath, { message: "Invalid stored path" }));

type PhotoFields = {
  samplePhotoPaths?: string[] | null;
  detailPhotoPaths?: string[] | null;
  reviewPhotoPaths?: string[] | null;
  packshotPaths?: string[] | null;
};

function computeOrphanedFiles(
  existing: { samplePhotoPaths: string | null; detailPhotoPaths: string | null; reviewPhotoPaths: string | null; packshotPaths: string | null },
  updated: PhotoFields
): string[] {
  const orphaned: string[] = [];
  const fields = [
    [existing.samplePhotoPaths, updated.samplePhotoPaths],
    [existing.detailPhotoPaths, updated.detailPhotoPaths],
    [existing.reviewPhotoPaths, updated.reviewPhotoPaths],
    [existing.packshotPaths, updated.packshotPaths],
  ] as const;
  for (const [oldRaw, newPaths] of fields) {
    if (newPaths === undefined) continue;
    const newSet = new Set(newPaths ?? []);
    orphaned.push(...safeParseArray(oldRaw).filter((p) => !newSet.has(p)));
  }
  return orphaned;
}

const SampleUpsertSchema = z.object({
  sampleId: z.string().optional(),
  samplePhotoPaths: storedPathArray.nullable().optional(),
  detailPhotoPaths: storedPathArray.nullable().optional(),
  reviewPhotoPaths: storedPathArray.nullable().optional(),
  reviewNotes: z.string().nullable().optional(),
  supplierName: z.string().nullable().optional(),
  supplierAddress: z.string().nullable().optional(),
  supplierCountry: z.string().nullable().optional(),
  shippingDate: z.string().datetime().nullable().optional(),
  trackingNumber: z.string().nullable().optional(),
  packshotPaths: storedPathArray.nullable().optional(),
  definitiveColors: z.array(z.string()).nullable().optional(),
  definitiveMaterials: z.array(z.string()).nullable().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profileId = getProfileId(req);
    if (!profileId) return unauthorizedResponse();

    const { id } = await params;
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    // Verify product ownership
    const product = await prisma.product.findFirst({
      where: { id, profileId, deletedAt: null },
    });
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const sample = await prisma.sample.findFirst({
      where: { productId: id },
    });
    return NextResponse.json(sample ?? null);
  } catch (error) {
    console.error('[GET /api/products/[id]/sample]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profileId = getProfileId(req);
    if (!profileId) return unauthorizedResponse();

    const { id } = await params;
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    // Verify product ownership
    const product = await prisma.product.findFirst({
      where: { id, profileId, deletedAt: null },
    });
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const result = await parseBodyJson(req, SampleUpsertSchema);
    if (!result.success) return result.response;
    const body = result.data;

    // Find the existing sample: by explicit sampleId, or by productId as fallback.
    // Using an explicit findFirst + create/update instead of upsert avoids the
    // fragile `id: sampleId ?? "new"` antipattern.
    const existingSample = body.sampleId
      ? await prisma.sample.findUnique({ where: { id: body.sampleId } })
      : await prisma.sample.findFirst({ where: { productId: id } });

    // Verify the sampleId belongs to this product (prevents updating another user's sample)
    if (existingSample && existingSample.productId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Compute orphaned files BEFORE the DB update (H-3: update DB first, delete files after
    // so a DB failure doesn't leave files deleted but paths still in the DB).
    const orphanedFiles = existingSample ? computeOrphanedFiles(existingSample, body) : [];

    let sample;
    if (existingSample) {
      sample = await prisma.sample.update({
        where: { id: existingSample.id },
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
    } else {
      sample = await prisma.sample.create({
        data: {
          productId: id,
          samplePhotoPaths: body.samplePhotoPaths ? JSON.stringify(body.samplePhotoPaths) : null,
          detailPhotoPaths: body.detailPhotoPaths ? JSON.stringify(body.detailPhotoPaths) : null,
          reviewPhotoPaths: body.reviewPhotoPaths ? JSON.stringify(body.reviewPhotoPaths) : null,
          reviewNotes: body.reviewNotes ?? null,
          supplierName: body.supplierName ?? null,
          supplierAddress: body.supplierAddress ?? null,
          supplierCountry: body.supplierCountry ?? null,
          shippingDate: body.shippingDate ? new Date(body.shippingDate) : null,
          trackingNumber: body.trackingNumber ?? null,
          packshotPaths: body.packshotPaths ? JSON.stringify(body.packshotPaths) : null,
          definitiveColors: body.definitiveColors ? JSON.stringify(body.definitiveColors) : null,
          definitiveMaterials: body.definitiveMaterials ? JSON.stringify(body.definitiveMaterials) : null,
        },
      });
    }

    // Delete orphaned files after successful DB update (H-3)
    if (orphanedFiles.length > 0) {
      await Promise.allSettled(orphanedFiles.map(deleteStoredFile));
    }

    return NextResponse.json(sample);
  } catch (error) {
    console.error('[PUT /api/products/[id]/sample]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Dedicated POST for creating a new sample if none exists
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profileId = getProfileId(req);
    if (!profileId) return unauthorizedResponse();

    const { id } = await params;
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

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
      // Compute orphaned files BEFORE updating (H-3: delete files AFTER DB success)
      const orphaned = computeOrphanedFiles(existing, body);

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
      // Delete orphaned files after successful DB update (H-3)
      if (orphaned.length > 0) {
        await Promise.allSettled(orphaned.map(deleteStoredFile));
      }
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
        packshotPaths: body.packshotPaths ? JSON.stringify(body.packshotPaths) : null,
        definitiveColors: body.definitiveColors ? JSON.stringify(body.definitiveColors) : null,
        definitiveMaterials: body.definitiveMaterials ? JSON.stringify(body.definitiveMaterials) : null,
      },
    });

    return NextResponse.json(sample, { status: 201 });
  } catch (error) {
    console.error('[POST /api/products/[id]/sample]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profileId = getProfileId(req);
    if (!profileId) return unauthorizedResponse();

    const { id } = await params;
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    // Verify product ownership
    const product = await prisma.product.findFirst({
      where: { id, profileId, deletedAt: null },
    });
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const sample = await prisma.sample.findFirst({ where: { productId: id } });
    if (!sample) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Collect all file paths before deletion (H-3: delete files after DB deletion)
    const allPaths = [
      ...safeParseArray(sample.samplePhotoPaths),
      ...safeParseArray(sample.detailPhotoPaths),
      ...safeParseArray(sample.reviewPhotoPaths),
      ...safeParseArray(sample.packshotPaths),
    ];

    await prisma.sample.delete({ where: { id: sample.id } });

    if (allPaths.length > 0) {
      await Promise.allSettled(allPaths.map(deleteStoredFile));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/products/[id]/sample]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
