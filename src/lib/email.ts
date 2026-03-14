// ─── Email utility ────────────────────────────────────────────────────────────
// Uses Resend when RESEND_API_KEY is set; silently skips otherwise (dev mode).

import { Resend } from "resend";
import { escapeHtml } from "@/lib/formatters";

const FROM_ADDRESS =
  process.env.RESEND_FROM_EMAIL ?? "PSL Studio <noreply@pslstudio.app>";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export interface InvitationEmailParams {
  to: string;
  inviterName: string;
  projectName: string;
  projectCode: string;
  appUrl: string; // e.g. https://pslstudio.app
}

export async function sendProjectInvitationEmail(
  params: InvitationEmailParams
): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn(
      "[email] RESEND_API_KEY not set — skipping invitation email to",
      params.to
    );
    return;
  }

  const joinUrl = `${params.appUrl}/projects`;

  // Escape all user-controlled values before embedding in HTML — inviterName and
  // projectName come from the database and could contain arbitrary characters.
  const safeName = escapeHtml(params.inviterName);
  const safeProject = escapeHtml(params.projectName);
  const safeCode = escapeHtml(params.projectCode);

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /></head>
<body style="font-family:sans-serif;background:#f4f4f6;margin:0;padding:32px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e5e7eb">
    <h1 style="font-size:20px;font-weight:300;color:#111;margin:0 0 8px">
      Invitation à collaborer
    </h1>
    <p style="color:#6b7280;font-size:14px;margin:0 0 24px">
      <strong style="color:#111">${safeName}</strong> vous invite à rejoindre le projet
      <strong style="color:#111">${safeProject}</strong> sur PSL Studio.
    </p>
    <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:24px;text-align:center">
      <p style="font-size:12px;color:#9ca3af;margin:0 0 4px">Code projet</p>
      <code style="font-size:20px;font-family:monospace;color:#111;letter-spacing:2px">
        ${safeCode}
      </code>
    </div>
    <a href="${joinUrl}"
       style="display:block;background:#111;color:#fff;text-decoration:none;text-align:center;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:500">
      Voir mes invitations →
    </a>
    <p style="color:#d1d5db;font-size:12px;margin:24px 0 0;text-align:center">
      PSL Studio · Gestion de collections mode
    </p>
  </div>
</body>
</html>`;

  // Subject: strip HTML tags as a safety measure (email subject is plain-text)
  await resend.emails.send({
    from: FROM_ADDRESS,
    to: params.to,
    subject: `${params.inviterName.replace(/<[^>]*>/g, "")} vous invite sur le projet "${params.projectName.replace(/<[^>]*>/g, "")}"`,
    html,
  });
}
