// ─── Date formatters ──────────────────────────────────────────────────────────

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const hasTime = hours !== 0 || minutes !== 0;
  const datePart = d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  if (!hasTime) return datePart;
  return `${datePart} ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

// ─── Security helpers ─────────────────────────────────────────────────────────

/**
 * Escape HTML special characters to prevent XSS when interpolating
 * user-controlled data into HTML strings (e.g. server-rendered PDF reports).
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

// ─── Array helpers ────────────────────────────────────────────────────────────

/**
 * Safely parse a JSON-serialised string array from the database.
 * Returns an empty array on null, non-array, or malformed JSON — never throws.
 */
export function safeParseArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? (parsed as unknown[]).filter((v): v is string => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}

// ─── URL validation ───────────────────────────────────────────────────────────

// Inlined from storage.ts to avoid pulling `fs/promises` into the client bundle.
function isStoredPath(s: string): boolean {
  return s.startsWith("/api/blob?url=") || s.startsWith("/api/files/");
}

// @deprecated: remove after running blob:migrate in production
function isLegacyPublicBlobUrl(s: string): boolean {
  try {
    const { protocol, hostname } = new URL(s);
    return (
      protocol === "https:" &&
      (hostname.endsWith(".vercel-storage.com") ||
        hostname.endsWith(".blob.vercel-storage.com"))
    );
  } catch {
    return false;
  }
}

/**
 * Returns true only for image URLs that are safe to embed in generated HTML.
 * Prevents SSRF / XSS via user-controlled img src attributes.
 *
 * Accepts:
 *   - /api/blob?url=<encoded>  production proxied blobs (see lib/storage.ts)
 *   - /api/files/<path>        development local files (see lib/storage.ts)
 *   - Legacy raw blob URLs     only during the migration window — see note below
 *
 * NOTE: The isLegacyPublicBlobUrl() branch exists for backward compatibility
 * while existing public blobs are being migrated to private access.
 * Remove it once `npm run blob:migrate` has been run in production.
 */
export function isTrustedImageUrl(url: string): boolean {
  if (isStoredPath(url)) return true;
  // @deprecated: remove after running blob:migrate in production
  if (isLegacyPublicBlobUrl(url)) return true;
  return false;
}
