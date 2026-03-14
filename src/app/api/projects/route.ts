import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseBodyJson, getProfileId, unauthorizedResponse } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

function generateProjectCode(): string {
  return randomBytes(4).toString("hex"); // 8 hex chars
}

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  productIds: z.array(z.string()).optional().default([]),
});

// GET /api/projects — list owned projects
export async function GET(req: NextRequest) {
  try {
    const profileId = getProfileId(req);
    if (!profileId) return unauthorizedResponse();

    const projects = await prisma.project.findMany({
      where: { profileId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { products: true, collaborators: true, contributions: true } },
      },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error("[GET /api/projects]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/projects — create a project (owner)
export async function POST(req: NextRequest) {
  try {
    const profileId = getProfileId(req);
    if (!profileId) return unauthorizedResponse();

    const result = await parseBodyJson(req, CreateProjectSchema);
    if (!result.success) return result.response;
    const body = result.data;

    // Verify all provided productIds belong to this profile
    if (body.productIds.length > 0) {
      const owned = await prisma.product.count({
        where: { id: { in: body.productIds }, profileId, deletedAt: null },
      });
      if (owned !== body.productIds.length) {
        return NextResponse.json(
          { error: "Un ou plusieurs produits sont introuvables." },
          { status: 422 }
        );
      }
    }

    const project = await prisma.project.create({
      data: {
        name: body.name,
        description: body.description ?? null,
        code: generateProjectCode(),
        profileId,
        products: {
          create: body.productIds.map((productId) => ({ productId })),
        },
      },
      include: {
        _count: { select: { products: true, collaborators: true } },
      },
    });

    logAudit("PROJECT_CREATE", profileId, "project", project.id, {
      code: project.code,
      productCount: body.productIds.length,
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("[POST /api/projects]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
