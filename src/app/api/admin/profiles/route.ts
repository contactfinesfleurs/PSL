import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseBodyJson } from "@/lib/api-helpers";
import { requireAdmin, requireSuperAdmin } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";
import { PROFILE_ROLE_VALUES } from "@/lib/constants";
import { hash } from "bcryptjs";
import { getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const SAFE_PROFILE_SELECT = {
  id: true,
  createdAt: true,
  name: true,
  email: true,
  role: true,
  teamId: true,
  team: { select: { id: true, name: true } },
} as const;

const ProfileCreateSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  role: z.enum(PROFILE_ROLE_VALUES).default("MEMBER"),
  teamId: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const limited = await rateLimitResponse(getClientIp(req));
    if (limited) return limited;

    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;

    if (auth.role === "SUPER_ADMIN") {
      const profiles = await prisma.profile.findMany({
        select: SAFE_PROFILE_SELECT,
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(profiles);
    }

    // ADMIN: only profiles in the same team
    if (!auth.teamId) {
      return NextResponse.json([]);
    }
    const profiles = await prisma.profile.findMany({
      where: { teamId: auth.teamId },
      select: SAFE_PROFILE_SELECT,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(profiles);
  } catch (error) {
    console.error("[GET /api/admin/profiles]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const limited = await rateLimitResponse(getClientIp(req));
    if (limited) return limited;

    const auth = await requireSuperAdmin(req);
    if (!auth.ok) return auth.response;

    const result = await parseBodyJson(req, ProfileCreateSchema);
    if (!result.success) return result.response;
    const data = result.data;

    const existing = await prisma.profile.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json({ error: "Un compte avec cet email existe déjà." }, { status: 409 });
    }

    if (data.teamId) {
      const team = await prisma.team.findUnique({ where: { id: data.teamId } });
      if (!team) return NextResponse.json({ error: "Équipe introuvable" }, { status: 404 });
    }

    const passwordHash = await hash(data.password, 12);
    const profile = await prisma.profile.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
        teamId: data.teamId ?? null,
      },
      select: SAFE_PROFILE_SELECT,
    });

    logAudit("ADMIN_PROFILE_CREATE", auth.profileId, "profile", profile.id, {
      name: data.name,
      email: data.email,
      role: data.role,
    });

    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/profiles]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
