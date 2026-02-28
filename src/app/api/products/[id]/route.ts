import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      samples: true,
      campaigns: {
        include: { campaign: true },
      },
      events: {
        include: { event: true },
      },
    },
  });

  if (!product) {
    return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
  }

  return NextResponse.json(product);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();

  const product = await prisma.product.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.family !== undefined && { family: body.family }),
      ...(body.season !== undefined && { season: body.season }),
      ...(body.year !== undefined && { year: body.year }),
      ...(body.sizeRange !== undefined && { sizeRange: body.sizeRange }),
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
      ...(body.techPackPath !== undefined && { techPackPath: body.techPackPath }),
      ...(body.sampleStatus !== undefined && {
        sampleStatus: body.sampleStatus,
      }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.metaTags !== undefined && {
        metaTags: JSON.stringify(body.metaTags),
      }),
      ...(body.plannedLaunchAt !== undefined && {
        plannedLaunchAt: body.plannedLaunchAt
          ? new Date(body.plannedLaunchAt)
          : null,
      }),
      ...(body.reference !== undefined && { reference: body.reference }),
    },
  });

  return NextResponse.json(product);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.product.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
