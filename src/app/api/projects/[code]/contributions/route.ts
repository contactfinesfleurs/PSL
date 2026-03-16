import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProfileId, unauthorizedResponse, parsePagination } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ code: string }> };

// GET /api/projects/[code]/contributions — all contributions across all products (owner only)
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const profileId = getProfileId(req);
    if (!profileId) return unauthorizedResponse();

    const { code } = await params;

    const project = await prisma.project.findUnique({ where: { code } });
    if (!project || project.profileId !== profileId) {
      return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
    }

    const { skip, take, page, limit } = parsePagination(req.nextUrl.searchParams);
    const [contributions, total] = await Promise.all([
      prisma.projectContribution.findMany({
        where: { projectId: project.id },
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: {
          profile: { select: { id: true, name: true } },
          product: { select: { id: true, name: true, sku: true } },
        },
      }),
      prisma.projectContribution.count({ where: { projectId: project.id } }),
    ]);

    return NextResponse.json({ data: contributions, total, page, limit });
  } catch (error) {
    console.error("[GET /api/projects/[code]/contributions]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
