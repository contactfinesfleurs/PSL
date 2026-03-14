import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProfileId, unauthorizedResponse } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

// GET /api/projects/joined — list projects this profile has joined as collaborator
export async function GET(req: NextRequest) {
  try {
    const profileId = getProfileId(req);
    if (!profileId) return unauthorizedResponse();

    const memberships = await prisma.projectCollaborator.findMany({
      where: { profileId },
      orderBy: { joinedAt: "desc" },
      include: {
        project: {
          include: {
            profile: { select: { id: true, name: true } },
            _count: { select: { products: true, contributions: true } },
          },
        },
      },
    });

    const projects = memberships.map((m) => ({
      ...m.project,
      joinedAt: m.joinedAt,
    }));

    return NextResponse.json(projects);
  } catch (error) {
    console.error("[GET /api/projects/joined]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
