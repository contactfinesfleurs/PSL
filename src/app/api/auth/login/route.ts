import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signToken, signChallengeToken, setSessionCookieOnResponse } from "@/lib/auth";
import { parseBodyJson } from "@/lib/api-helpers";
import { getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { logSecurityEvent, isAccountLocked } from "@/lib/security-events";

export const dynamic = "force-dynamic";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    // Rate limiting: max 5 attempts per IP per 15-minute window.
    const ip = getClientIp(req);
    const limited = rateLimitResponse(ip);
    if (limited) return limited;

    const result = await parseBodyJson(req, LoginSchema);
    if (!result.success) return result.response;
    const { email, password } = result.data;

    // Account lockout check (10 failures in 15 min across all IPs)
    if (await isAccountLocked(email)) {
      await logSecurityEvent({
        type: "ACCOUNT_LOCKED",
        email,
        ip,
        userAgent: req.headers.get("user-agent") ?? undefined,
      });
      return NextResponse.json(
        { error: "Compte temporairement verrouillé. Réessayez dans 15 minutes." },
        { status: 423 }
      );
    }

    const profile = await prisma.profile.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        totpEnabled: true,
      },
    });

    if (!profile) {
      await logSecurityEvent({
        type: "LOGIN_FAIL",
        email,
        ip,
        userAgent: req.headers.get("user-agent") ?? undefined,
        metadata: { reason: "unknown_email" },
      });
      return NextResponse.json(
        { error: "Email ou mot de passe incorrect" },
        { status: 401 }
      );
    }

    const valid = await compare(password, profile.passwordHash);
    if (!valid) {
      await logSecurityEvent({
        type: "LOGIN_FAIL",
        profileId: profile.id,
        email,
        ip,
        userAgent: req.headers.get("user-agent") ?? undefined,
        metadata: { reason: "wrong_password" },
      });
      return NextResponse.json(
        { error: "Email ou mot de passe incorrect" },
        { status: 401 }
      );
    }

    // 2FA: if enabled, return a short-lived challenge token instead of session
    if (profile.totpEnabled) {
      const challengeToken = await signChallengeToken({
        challengeProfileId: profile.id,
        email: profile.email,
        purpose: "2fa",
      });
      return NextResponse.json({ requires2fa: true, challengeToken });
    }

    // No 2FA: issue session directly
    const token = await signToken({
      profileId: profile.id,
      email: profile.email,
      name: profile.name,
    });

    await logSecurityEvent({
      type: "LOGIN_SUCCESS",
      profileId: profile.id,
      email,
      ip,
      userAgent: req.headers.get("user-agent") ?? undefined,
    });

    const res = NextResponse.json({ name: profile.name, email: profile.email });
    setSessionCookieOnResponse(res, token);
    return res;
  } catch (error) {
    console.error('[POST /api/auth/login]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
