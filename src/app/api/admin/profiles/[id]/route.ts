import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseBodyJson } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";
import { PROFILE_ROLE_VALUES } from "@/lib/constants";

export const dynamic = "force-dynamic";

const ProfilePatchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z.enum(PROFILE_ROLE_VALUES).optional(),
  teamId: z.string().nullable().optional(),
});

const SAFE_PROFILE_SELECT = {
  id: true,
  createdAt: true,
  name: true,
  email: true,
  role: true,
  teamId: true,
  team: { select: { id: true, name: true } },
} as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    if (!id || typeof id !== "string" || id.trim() === "") {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const target = await prisma.profile.findUnique({
      where: { id },
      select: { id: true, role: true, teamId: true },
    });
    if (!target) return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });

    // ADMIN can only patch profiles in their own team
    if (auth.role === "ADMIN") {
      if (!auth.teamId || target.teamId !== auth.teamId) {
        return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
      }
    }

    const result = await parseBodyJson(req, ProfilePatchSchema);
    if (!result.success) return result.response;
    const body = result.data;

    // ADMIN cannot elevate to SUPER_ADMIN and cannot change their own role
    if (auth.role === "ADMIN") {
      if (body.role === "SUPER_ADMIN") {
        return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
      }
      if (id === auth.profileId && body.role !== undefined) {
        return NextResponse.json({ error: "Vous ne pouvez pas modifier votre propre rôle." }, { status: 403 });
      }
    }

    // Prevent demoting the last SUPER_ADMIN
    if (body.role && body.role !== "SUPER_ADMIN" && target.role === "SUPER_ADMIN") {
      const superAdminCount = await prisma.profile.count({ where: { role: "SUPER_ADMIN" } });
      if (superAdminCount <= 1) {
        return NextResponse.json({ error: "Impossible de rétrograder le dernier super-administrateur." }, { status: 409 });
      }
    }

    if (body.teamId) {
      const team = await prisma.team.findUnique({ where: { id: body.teamId } });
      if (!team) return NextResponse.json({ error: "Équipe introuvable" }, { status: 404 });
    }

    const updated = await prisma.profile.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.role !== undefined && { role: body.role }),
        ...(body.teamId !== undefined && { teamId: body.teamId }),
      },
      select: SAFE_PROFILE_SELECT,
    });

    logAudit("ADMIN_PROFILE_PATCH", auth.profileId, "profile", id, { fields: Object.keys(body) });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/admin/profiles/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
