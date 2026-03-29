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
