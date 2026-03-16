import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signToken, setSessionCookie } from "@/lib/auth";
import { parseBodyJson } from "@/lib/api-helpers";
import { getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { logAudit, logSecurityEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

const LoginSchema = z.object({
  email: z.string().email().transform((e) => e.toLowerCase()),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    // Rate limiting: max 5 attempts per IP per 15-minute window.
    const ip = getClientIp(req);
    const limited = await rateLimitResponse(`login:${ip}`);
    if (limited) return limited;

    const result = await parseBodyJson(req, LoginSchema);
    if (!result.success) return result.response;
    const { email, password } = result.data;

    const profile = await prisma.profile.findUnique({ where: { email } });

    // Always run bcrypt compare — even when the profile doesn't exist — so that
    // an attacker cannot enumerate valid emails via response-time differences.
    const DUMMY_HASH = "$2b$12$aaaaaaaaaaaaaaaaaaaaaa.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    const valid = await compare(password, profile?.passwordHash ?? DUMMY_HASH);

    if (!profile || !valid) {
      logSecurityEvent("LOGIN_FAILURE", null, { email, ip: getClientIp(req) });
      return NextResponse.json(
        { error: "Email ou mot de passe incorrect" },
        { status: 401 }
      );
    }

    const token = await signToken({
      profileId: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
    });

    await setSessionCookie(token, profile.role ?? undefined);

    logAudit("LOGIN_SUCCESS", profile.id, "profile", profile.id, { ip: getClientIp(req) });

    return NextResponse.json({ name: profile.name, email: profile.email });
  } catch (error) {
    console.error('[POST /api/auth/login]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
