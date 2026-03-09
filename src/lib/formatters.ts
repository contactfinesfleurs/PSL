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

/**
 * Returns true only for image URLs from trusted origins (Vercel Blob or local uploads).
 * Prevents SSRF / XSS via user-controlled img src attributes in generated HTML.
 */
export function isTrustedImageUrl(url: string): boolean {
  if (url.startsWith("/uploads/")) return true;
  try {
    const { protocol, hostname } = new URL(url);
    return (
      protocol === "https:" &&
      (hostname.endsWith(".vercel-storage.com") ||
        hostname.endsWith(".blob.vercel-storage.com"))
    );
  } catch {
    return false;
  }
}
