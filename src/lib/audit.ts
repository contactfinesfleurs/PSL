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
