import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyTotpCode } from "@/lib/totp";
import { parseBodyJson } from "@/lib/api-helpers";
import { logSecurityEvent } from "@/lib/security-events";
import { getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const VerifySchema = z.object({
  code: z.string().length(6).regex(/^\d{6}$/),
});

export async function POST(req: NextRequest) {
  try {
    const profileId = (await headers()).get("x-profile-id");
    if (!profileId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const result = await parseBodyJson(req, VerifySchema);
    if (!result.success) return result.response;
    const { code } = result.data;

    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: { email: true, totpSecret: true, totpEnabled: true },
    });

    if (!profile || !profile.totpSecret) {
      return NextResponse.json(
        { error: "Lancez d'abord la configuration 2FA" },
        { status: 400 }
      );
    }

    if (profile.totpEnabled) {
      return NextResponse.json(
        { error: "La double authentification est déjà activée" },
        { status: 409 }
      );
    }

    const valid = verifyTotpCode(profile.totpSecret, code);
    if (!valid) {
      await logSecurityEvent({
        type: "TOTP_FAIL",
        profileId,
        email: profile.email,
        ip: getClientIp(req),
        metadata: { context: "setup_verification" },
      });
      return NextResponse.json(
        { error: "Code invalide. Vérifiez votre application d'authentification." },
        { status: 401 }
      );
    }

    // Enable 2FA
    await prisma.profile.update({
      where: { id: profileId },
      data: { totpEnabled: true },
    });

    await logSecurityEvent({
      type: "TOTP_ENABLED",
      profileId,
      email: profile.email,
      ip: getClientIp(req),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[POST /api/auth/2fa/verify]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
