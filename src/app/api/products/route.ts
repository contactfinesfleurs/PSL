import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSKU } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const family = searchParams.get("family");
  const season = searchParams.get("season");

  const products = await prisma.product.findMany({
    where: {
      ...(status ? { sampleStatus: status as never } : {}),
      ...(family ? { family } : {}),
      ...(season ? { season } : {}),
    },
    include: { samples: true, campaigns: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Count existing products in this family+season+year to generate index
  const count = await prisma.product.count({
    where: {
      family: body.family,
      season: body.season,
      year: body.year,
    },
  });

  const sku = generateSKU({
    family: body.family,
    season: body.season,
    year: body.year,
    index: count + 1,
  });

  const product = await prisma.product.create({
    data: {
      name: body.name,
      sku,
      family: body.family,
      season: body.season,
      year: body.year,
      sizeRange: body.sizeRange,
      sizes: JSON.stringify(body.sizes ?? []),
      measurements: body.measurements ? JSON.stringify(body.measurements) : null,
      materials: body.materials ? JSON.stringify(body.materials) : null,
      colors: body.colors ? JSON.stringify(body.colors) : null,
      reference: body.reference ?? null,
    },
  });

  return NextResponse.json(product, { status: 201 });
}
