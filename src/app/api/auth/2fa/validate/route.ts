import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  verifyChallengeToken,
  signToken,
  setSessionCookieOnResponse,
} from "@/lib/auth";
import { verifyTotpCode } from "@/lib/totp";
import { parseBodyJson } from "@/lib/api-helpers";
import { logSecurityEvent } from "@/lib/security-events";
import { getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// Per-challenge TOTP brute-force protection: max 5 attempts per challenge token
const totpAttempts = new Map<string, number>();

const TOTP_MAX_ATTEMPTS = 5;

function checkTotpAttempts(tokenFingerprint: string): boolean {
  const attempts = totpAttempts.get(tokenFingerprint) ?? 0;
  if (attempts >= TOTP_MAX_ATTEMPTS) return false;
  totpAttempts.set(tokenFingerprint, attempts + 1);
  // Cleanup: remove old entries periodically
  if (totpAttempts.size > 10_000) {
    const keys = Array.from(totpAttempts.keys());
    for (const k of keys.slice(0, 5_000)) totpAttempts.delete(k);
  }
  return true;
}

const ValidateSchema = z.object({
  challengeToken: z.string().min(1),
  code: z.string().length(6).regex(/^\d{6}$/),
});

/** Second step of login: verify TOTP code after password was confirmed. */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);

    const result = await parseBodyJson(req, ValidateSchema);
    if (!result.success) return result.response;
    const { challengeToken, code } = result.data;

    // Verify the challenge token (5-min TTL)
    const challenge = await verifyChallengeToken(challengeToken);
    if (!challenge) {
      return NextResponse.json(
        { error: "Session expirée. Veuillez vous reconnecter." },
        { status: 401 }
      );
    }

    // Per-challenge brute-force protection: 5 attempts max per token
    const tokenFp = challengeToken.slice(-16); // fingerprint (last 16 chars)
    if (!checkTotpAttempts(tokenFp)) {
      await logSecurityEvent({
        type: "TOTP_FAIL",
        profileId: challenge.challengeProfileId,
        email: challenge.email,
        ip,
        metadata: { context: "totp_brute_force_blocked" },
      });
      return NextResponse.json(
        { error: "Trop de tentatives. Veuillez vous reconnecter." },
        { status: 429 }
      );
    }

    const profile = await prisma.profile.findUnique({
      where: { id: challenge.challengeProfileId },
      select: { id: true, name: true, email: true, totpSecret: true, totpEnabled: true },
    });

    if (!profile || !profile.totpEnabled || !profile.totpSecret) {
      return NextResponse.json(
        { error: "Configuration 2FA invalide" },
        { status: 400 }
      );
    }

    const valid = verifyTotpCode(profile.totpSecret, code);
    if (!valid) {
      await logSecurityEvent({
        type: "TOTP_FAIL",
        profileId: profile.id,
        email: profile.email,
        ip,
        userAgent: req.headers.get("user-agent") ?? undefined,
        metadata: { context: "login_validation" },
      });
      return NextResponse.json(
        { error: "Code invalide" },
        { status: 401 }
      );
    }

    // Issue full session token
    const token = await signToken({
      profileId: profile.id,
      email: profile.email,
      name: profile.name,
    });

    await logSecurityEvent({
      type: "LOGIN_SUCCESS",
      profileId: profile.id,
      email: profile.email,
      ip,
      userAgent: req.headers.get("user-agent") ?? undefined,
      metadata: { via: "2fa" },
    });

    const res = NextResponse.json({ name: profile.name, email: profile.email });
    setSessionCookieOnResponse(res, token);
    return res;
  } catch (error) {
    console.error("[POST /api/auth/2fa/validate]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
