import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseBodyJson } from "@/lib/api-helpers";
import { requireAdmin, requireSuperAdmin } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";
import { getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const TeamCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const limited = await rateLimitResponse(`admin-teams:${getClientIp(req)}`, "loose");
    if (limited) return limited;
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;

    if (auth.role === "SUPER_ADMIN") {
      const teams = await prisma.team.findMany({
        include: { _count: { select: { members: true } } },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(teams);
    }

    // ADMIN: only their own team
    if (!auth.teamId) return NextResponse.json([]);
    const teams = await prisma.team.findMany({
      where: { id: auth.teamId },
      include: { _count: { select: { members: true } } },
    });
    return NextResponse.json(teams);
  } catch (error) {
    console.error("[GET /api/admin/teams]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const limited = await rateLimitResponse(`admin-teams:${getClientIp(req)}`, "moderate");
    if (limited) return limited;
    const auth = await requireSuperAdmin(req);
    if (!auth.ok) return auth.response;

    const result = await parseBodyJson(req, TeamCreateSchema);
    if (!result.success) return result.response;
    const data = result.data;

    const team = await prisma.team.create({
      data: { name: data.name, description: data.description ?? null },
      include: { _count: { select: { members: true } } },
    });

    logAudit("ADMIN_TEAM_CREATE", auth.profileId, "team", team.id, { name: data.name });

    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/teams]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
