import { prisma } from "@/lib/prisma";

export type SecurityEventType =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAIL"
  | "TOTP_ENABLED"
  | "TOTP_DISABLED"
  | "TOTP_FAIL"
  | "RATE_LIMITED"
  | "ACCOUNT_LOCKED";

interface LogEventParams {
  type: SecurityEventType;
  profileId?: string;
  email?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log a security event to the database and structured console output.
 * Fire-and-forget — errors are caught to avoid breaking the caller.
 */
export async function logSecurityEvent(params: LogEventParams): Promise<void> {
  const { type, profileId, email, ip, userAgent, metadata } = params;

  // Structured console log (always visible in Vercel runtime logs)
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "SECURITY",
      type,
      profileId: profileId ?? null,
      email: email ?? null,
      ip: ip ?? null,
    })
  );

  try {
    await prisma.securityEvent.create({
      data: {
        type,
        profileId: profileId ?? null,
        email: email ?? null,
        ip: ip ?? null,
        userAgent: userAgent ?? null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  } catch (err) {
    // Don't break the caller if DB write fails
    console.error("[SecurityEvent] Failed to write event:", err);
  }
}

/**
 * Count recent failed login attempts for a given email.
 */
export async function getRecentFailedAttempts(
  email: string,
  windowMinutes = 15
): Promise<number> {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);

  return prisma.securityEvent.count({
    where: {
      email,
      type: "LOGIN_FAIL",
      createdAt: { gte: since },
    },
  });
}

const LOCKOUT_THRESHOLD = 10;

/**
 * Check if an account is soft-locked due to too many failed login attempts.
 * Locks after 10 failures within 15 minutes (per email, across all IPs).
 */
export async function isAccountLocked(email: string): Promise<boolean> {
  const failures = await getRecentFailedAttempts(email, 15);
  return failures >= LOCKOUT_THRESHOLD;
}
