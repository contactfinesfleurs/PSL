import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseBodyJson } from "@/lib/api-helpers";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";
import { getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const TeamPatchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const limited = await rateLimitResponse(`admin-teams-id:${getClientIp(req)}`, "moderate");
    if (limited) return limited;
    const auth = await requireSuperAdmin(req);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    if (!id || typeof id !== "string" || id.trim() === "") {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) return NextResponse.json({ error: "Équipe introuvable" }, { status: 404 });

    const result = await parseBodyJson(req, TeamPatchSchema);
    if (!result.success) return result.response;
    const body = result.data;

    const updated = await prisma.team.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
      },
      include: { _count: { select: { members: true } } },
    });

    logAudit("ADMIN_TEAM_PATCH", auth.profileId, "team", id, { fields: Object.keys(body) });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/admin/teams/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const limited = await rateLimitResponse(`admin-teams-id:${getClientIp(req)}`, "moderate");
    if (limited) return limited;
    const auth = await requireSuperAdmin(req);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    if (!id || typeof id !== "string" || id.trim() === "") {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) return NextResponse.json({ error: "Équipe introuvable" }, { status: 404 });

    // Profile.teamId has onDelete: SetNull — members retain their accounts, teamId → null
    await prisma.team.delete({ where: { id } });

    logAudit("ADMIN_TEAM_DELETE", auth.profileId, "team", id, { name: team.name });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/teams/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
