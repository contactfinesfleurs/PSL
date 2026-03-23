import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseBodyJson } from "@/lib/api-helpers";
import { getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { logSecurityEvent } from "@/lib/audit";
import { escapeHtml } from "@/lib/formatters";

export const dynamic = "force-dynamic";

const RESET_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

const RequestSchema = z.object({
  email: z.string().email(),
});

const FROM_ADDRESS =
  process.env.RESEND_FROM_EMAIL ?? "PSL Studio <noreply@pslstudio.app>";

async function sendResetEmail(to: string, token: string): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;

  const safeUrl = escapeHtml(resetUrl);

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /></head>
<body style="font-family:sans-serif;background:#f4f4f6;margin:0;padding:32px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e5e7eb">
    <h1 style="font-size:20px;font-weight:300;color:#111;margin:0 0 8px">
      Réinitialisation de mot de passe
    </h1>
    <p style="color:#6b7280;font-size:14px;margin:0 0 24px">
      Vous avez demandé une réinitialisation de votre mot de passe PSL Studio.
      Ce lien expire dans <strong>1 heure</strong>.
    </p>
    <a href="${safeUrl}"
       style="display:block;background:#111;color:#fff;text-decoration:none;text-align:center;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:500">
      Réinitialiser mon mot de passe →
    </a>
    <p style="color:#9ca3af;font-size:12px;margin:24px 0 0;text-align:center">
      Si vous n'avez pas fait cette demande, ignorez cet email.
    </p>
    <p style="color:#d1d5db;font-size:12px;margin:8px 0 0;text-align:center">
      PSL Studio · Gestion de collections mode
    </p>
  </div>
</body>
</html>`;

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    // Development: log reset link so developers can test without email infrastructure.
    console.warn(
      `[reset-password] RESEND_API_KEY not set — password reset link for ${to}:`,
      resetUrl
    );
    return;
  }

  const { Resend } = await import("resend");
  const resend = new Resend(resendKey);

  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: "Réinitialisation de votre mot de passe PSL Studio",
    html,
  });
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);

    // Rate limit by IP (strict: 5 / 15 min)
    const ipLimited = await rateLimitResponse(`reset-password-request:ip:${ip}`);
    if (ipLimited) return ipLimited;

    const result = await parseBodyJson(req, RequestSchema);
    if (!result.success) {
      // Return 200 regardless to prevent enumeration via error messages
      return NextResponse.json({
        message: "If this email exists, you will receive a reset link",
      });
    }

    const { email } = result.data;

    // Rate limit by email: max 3 requests per email per hour
    const emailKey = `reset-password-request:email:${email}`;
    const emailLimited = await rateLimitResponse(emailKey, "moderate");
    if (emailLimited) {
      // Still return 200 to prevent timing-based enumeration
      logSecurityEvent("RATE_LIMIT_HIT", null, {
        key: emailKey,
        tier: "moderate",
        context: "reset-password-request",
      });
      return NextResponse.json({
        message: "If this email exists, you will receive a reset link",
      });
    }

    const profile = await prisma.profile.findUnique({ where: { email } });

    if (profile) {
      const rawToken = crypto.randomUUID();
      const hashedToken = createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + RESET_EXPIRY_MS);

      await prisma.passwordResetToken.create({
        data: {
          profileId: profile.id,
          token: hashedToken,
          expiresAt,
        },
      });

      await sendResetEmail(email, rawToken);

      logSecurityEvent("PASSWORD_RESET_REQUESTED", profile.id, { email, ip });
    }

    // Always return 200 — no email enumeration
    return NextResponse.json({
      message: "If this email exists, you will receive a reset link",
    });
  } catch (error) {
    console.error("[POST /api/auth/reset-password/request]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
