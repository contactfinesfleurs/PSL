/**
 * Audit logging utility.
 *
 * Writes structured JSON audit entries to console.log.
 * In production, replace the console.log call with a call to a dedicated
 * logging service (e.g. Datadog, Logtail, CloudWatch, etc.).
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
}

/**
 * Security event logging.
 *
 * Like logAudit but for security-relevant events that are not tied to a
 * specific resource (auth failures, rate-limit hits, CSRF rejections, etc.).
 * These should be routed to a SIEM or alerting pipeline in production.
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
}
