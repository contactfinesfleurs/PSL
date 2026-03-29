import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { generateTotpSecret, encryptSecret } from "@/lib/totp";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const profileId = (await headers()).get("x-profile-id");
    if (!profileId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: { email: true, totpEnabled: true },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
    }

    if (profile.totpEnabled) {
      return NextResponse.json(
        { error: "La double authentification est déjà activée" },
        { status: 409 }
      );
    }

    // Generate TOTP secret and encrypt it
    const { base32Secret, uri } = generateTotpSecret(profile.email);
    const encrypted = encryptSecret(base32Secret);

    // Save encrypted secret (but don't enable 2FA yet — that happens after verification)
    await prisma.profile.update({
      where: { id: profileId },
      data: { totpSecret: encrypted, totpEnabled: false },
    });

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(uri);

    return NextResponse.json({
      qrCodeDataUrl,
      manualEntryKey: base32Secret,
    });
  } catch (error) {
    console.error("[GET /api/auth/2fa/setup]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
