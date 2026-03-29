import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyTotpCode } from "@/lib/totp";
import { parseBodyJson } from "@/lib/api-helpers";
import { logSecurityEvent } from "@/lib/security-events";
import { getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const DisableSchema = z.object({
  code: z.string().length(6).regex(/^\d{6}$/),
});

export async function POST(req: NextRequest) {
  try {
    const profileId = (await headers()).get("x-profile-id");
    if (!profileId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const result = await parseBodyJson(req, DisableSchema);
    if (!result.success) return result.response;
    const { code } = result.data;

    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: { email: true, totpSecret: true, totpEnabled: true },
    });

    if (!profile || !profile.totpEnabled || !profile.totpSecret) {
      return NextResponse.json(
        { error: "La double authentification n'est pas activée" },
        { status: 400 }
      );
    }

    // Must verify current TOTP code to disable (prevents disabling without authenticator)
    const valid = verifyTotpCode(profile.totpSecret, code);
    if (!valid) {
      await logSecurityEvent({
        type: "TOTP_FAIL",
        profileId,
        email: profile.email,
        ip: getClientIp(req),
        metadata: { context: "disable_attempt" },
      });
      return NextResponse.json(
        { error: "Code invalide" },
        { status: 401 }
      );
    }

    await prisma.profile.update({
      where: { id: profileId },
      data: { totpEnabled: false, totpSecret: null },
    });

    await logSecurityEvent({
      type: "TOTP_DISABLED",
      profileId,
      email: profile.email,
      ip: getClientIp(req),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[POST /api/auth/2fa/disable]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
