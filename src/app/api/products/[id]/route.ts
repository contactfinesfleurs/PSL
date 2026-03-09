import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseBodyJson, getProfileId, unauthorizedResponse } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const ProductPatchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  family: z.string().min(1).max(100).optional(),
  season: z.string().min(1).max(100).optional(),
  year: z.number().int().min(2000).max(2100).optional(),
  sizeRange: z.string().min(1).max(100).optional(),
  sizes: z.array(z.string().max(20)).optional(),
  measurements: z.string().nullable().optional(),
  materials: z.array(z.string().max(200)).nullable().optional(),
  colors: z.array(z.string().max(100)).nullable().optional(),
  colorPrimary: z.string().max(10).nullable().optional(),
  colorSecondary: z.string().max(10).nullable().optional(),
  sketchPaths: z.array(z.string()).nullable().optional(),
  techPackPath: z.string().max(500).nullable().optional(),
  sampleStatus: z.enum(["PENDING", "VALIDATED", "NOT_VALIDATED"]).optional(),
  description: z.string().max(5000).nullable().optional(),
  metaTags: z.array(z.string().max(100)).nullable().optional(),
  plannedLaunchAt: z.string().datetime().nullable().optional(),
  reference: z.string().max(200).nullable().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profileId = getProfileId(req);
  if (!profileId) return unauthorizedResponse();

  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id, profileId },
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
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profileId = getProfileId(req);
  if (!profileId) return unauthorizedResponse();

  const { id } = await params;

  // Verify ownership before patching
  const existing = await prisma.product.findUnique({ where: { id, profileId } });
  if (!existing) {
    return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
  }

  const result = await parseBodyJson(req, ProductPatchSchema);
  if (!result.success) return result.response;
  const body = result.data;

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.family !== undefined && { family: body.family }),
      ...(body.season !== undefined && { season: body.season }),
      ...(body.year !== undefined && { year: body.year }),
      ...(body.sizeRange !== undefined && { sizeRange: body.sizeRange }),
      ...(body.sizes !== undefined && { sizes: JSON.stringify(body.sizes) }),
      ...(body.measurements !== undefined && { measurements: body.measurements ?? null }),
      ...(body.materials !== undefined && { materials: JSON.stringify(body.materials) }),
      // Merge colorPrimary/colorSecondary into colors JSON array
      ...((body.colorPrimary !== undefined || body.colorSecondary !== undefined || body.colors !== undefined) && {
        colors: (() => {
          if (body.colorPrimary !== undefined || body.colorSecondary !== undefined) {
            const codes = [body.colorPrimary, body.colorSecondary].filter(Boolean) as string[];
            return codes.length > 0 ? JSON.stringify(codes) : null;
          }
          return body.colors !== undefined ? JSON.stringify(body.colors) : undefined;
        })(),
      }),
      ...(body.sketchPaths !== undefined && { sketchPaths: JSON.stringify(body.sketchPaths) }),
      ...(body.techPackPath !== undefined && { techPackPath: body.techPackPath }),
      ...(body.sampleStatus !== undefined && { sampleStatus: body.sampleStatus }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.metaTags !== undefined && { metaTags: JSON.stringify(body.metaTags) }),
      ...(body.plannedLaunchAt !== undefined && {
        plannedLaunchAt: body.plannedLaunchAt ? new Date(body.plannedLaunchAt) : null,
      }),
      ...(body.reference !== undefined && { reference: body.reference }),
    },
  });

  return NextResponse.json(product);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profileId = getProfileId(req);
  if (!profileId) return unauthorizedResponse();

  const { id } = await params;

  // Verify ownership before deleting
  const existing = await prisma.product.findUnique({ where: { id, profileId } });
  if (!existing) {
    return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
  }

  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
