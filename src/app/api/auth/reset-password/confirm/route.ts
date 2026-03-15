import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseBodyJson } from "@/lib/api-helpers";
import { getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { logAudit, logSecurityEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

// Top-100 most commonly used passwords (HIBP / NCSC list) — kept in sync with register route
const COMMON_PASSWORDS = new Set([
  "password","password1","password123","123456","12345678","123456789","1234567890",
  "qwerty","qwerty123","azerty","azerty123","111111","000000","iloveyou","admin",
  "welcome","monkey","dragon","master","letmein","login","pass","test","abc123",
  "sunshine","princess","shadow","superman","michael","football","baseball","solo",
  "charlie","donald","batman","trustno1","hello","jesus","ninja","mustang","access",
  "696969","passw0rd","starwars","pokemon","2000","1111","12345","1q2w3e","1q2w3e4r",
  "password!","p@ssword","p@ssw0rd","pass123","pass1234","qwerty!","qwerty1",
]);

const ConfirmSchema = z.object({
  token: z.string().min(1),
  newPassword: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .max(100)
    .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule")
    .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre")
    .regex(/[^A-Za-z0-9]/, "Le mot de passe doit contenir au moins un caractère spécial")
    .refine((p) => !COMMON_PASSWORDS.has(p.toLowerCase()), {
      message: "Ce mot de passe est trop courant, veuillez en choisir un plus original",
    }),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);

    // Rate limit to prevent brute-forcing tokens
    const limited = await rateLimitResponse(`reset-password-confirm:${ip}`);
    if (limited) return limited;

    const result = await parseBodyJson(req, ConfirmSchema);
    if (!result.success) return result.response;

    const { token, newPassword } = result.data;

    // Hash the incoming raw token to match the stored SHA-256 hash
    const hashedToken = createHash("sha256").update(token).digest("hex");

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: hashedToken },
      include: { profile: true },
    });

    if (!resetToken) {
      logSecurityEvent("PASSWORD_RESET_INVALID_TOKEN", null, { ip });
      return NextResponse.json(
        { error: "Token invalide ou expiré" },
        { status: 400 }
      );
    }

    if (resetToken.usedAt) {
      logSecurityEvent("PASSWORD_RESET_ALREADY_USED", resetToken.profileId, { ip });
      return NextResponse.json(
        { error: "Token invalide ou expiré" },
        { status: 400 }
      );
    }

    if (resetToken.expiresAt < new Date()) {
      logSecurityEvent("PASSWORD_RESET_EXPIRED_TOKEN", resetToken.profileId, { ip });
      return NextResponse.json(
        { error: "Token invalide ou expiré" },
        { status: 400 }
      );
    }

    const passwordHash = await hash(newPassword, 12);

    // Update password and mark token as used in a transaction
    await prisma.$transaction([
      prisma.profile.update({
        where: { id: resetToken.profileId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    logAudit("PASSWORD_RESET_SUCCESS", resetToken.profileId, "profile", resetToken.profileId, { ip });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[POST /api/auth/reset-password/confirm]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
