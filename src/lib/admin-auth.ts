import { NextRequest, NextResponse } from "next/server";
import { getProfileId, forbiddenResponse, unauthorizedResponse } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export type AdminAuthResult =
  | { ok: true; profileId: string; role: string; teamId: string | null }
  | { ok: false; response: NextResponse };

/**
 * Require ADMIN or SUPER_ADMIN role. Returns 401 if not authenticated, 403 if not admin.
 */
export async function requireAdmin(req: NextRequest): Promise<AdminAuthResult> {
  const profileId = getProfileId(req);
  if (!profileId) return { ok: false, response: unauthorizedResponse() };

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { role: true, teamId: true },
  });

  if (!profile || (profile.role !== "SUPER_ADMIN" && profile.role !== "ADMIN")) {
    return { ok: false, response: forbiddenResponse("Accès réservé aux administrateurs") };
  }

  return { ok: true, profileId, role: profile.role, teamId: profile.teamId };
}

/**
 * Require SUPER_ADMIN role only.
 */
export async function requireSuperAdmin(req: NextRequest): Promise<AdminAuthResult> {
  const profileId = getProfileId(req);
  if (!profileId) return { ok: false, response: unauthorizedResponse() };

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { role: true, teamId: true },
  });

  if (!profile || profile.role !== "SUPER_ADMIN") {
    return { ok: false, response: forbiddenResponse("Accès réservé aux super-administrateurs") };
  }

  return { ok: true, profileId, role: profile.role, teamId: profile.teamId };
}
