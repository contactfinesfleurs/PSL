/**
 * Audit & security logging.
 *
 * When LOGTAIL_SOURCE_TOKEN is set, logs are forwarded to Logtail (Better Stack)
 * in addition to console. In development / when the token is absent, only the
 * local console is used.
 */
import { Logtail } from "@logtail/node";

// Lazily-initialised singleton — avoids instantiation at import time when the
// token is not present (e.g. during build or local dev).
let _logtail: Logtail | null = null;

function getLogtail(): Logtail | null {
  if (_logtail !== null) return _logtail;
  const token = process.env.LOGTAIL_SOURCE_TOKEN;
  if (!token) return null;
  _logtail = new Logtail(token);
  return _logtail;
}

/**
 * Audit logging for resource-level actions (create, update, delete…).
 * These entries should be stored durably and made searchable in production.
 */
export function logAudit(
  action: string,
  profileId: string | null,
  resourceType: string,
  resourceId: string,
  metadata?: Record<string, unknown>
): void {
  const entry = {
    timestamp: new Date().toISOString(),
    action,
    profileId,
    resourceType,
    resourceId,
    ...(metadata !== undefined && { metadata }),
  };

  console.log(JSON.stringify(entry));

  const logtail = getLogtail();
  if (logtail) {
    logtail.info(action, entry).catch((err) => {
      // Log locally so audit failures are visible even if Logtail is down.
      console.error("[AUDIT FALLBACK] Logtail send failed:", action, err instanceof Error ? err.message : String(err));
    });
  }
}

/**
 * Security event logging for auth failures, rate-limit hits, CSRF rejections…
 * Route these to a SIEM or alerting pipeline in production.
 */
export function logSecurityEvent(
  event: string,
  profileId: string | null,
  metadata?: Record<string, unknown>
): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level: "SECURITY",
    event,
    profileId,
    ...(metadata !== undefined && { metadata }),
  };

  console.warn(JSON.stringify(entry));

  const logtail = getLogtail();
  if (logtail) {
    logtail.warn(event, entry).catch((err) => {
      console.error("[AUDIT FALLBACK] Logtail send failed:", event, err instanceof Error ? err.message : String(err));
    });
  }
}
