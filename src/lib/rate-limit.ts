/**
 * In-memory sliding window rate limiter.
 * No external dependencies required.
 *
 * Limits: max 5 requests per IP within a 15-minute window.
 */

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 5;

interface RequestRecord {
  timestamps: number[];
}

// Module-level Map — persists across requests within the same Node.js process.
const store = new Map<string, RequestRecord>();

/**
 * Extracts the client IP from standard proxy headers or falls back to a
 * placeholder so the limiter still works when no IP is available.
 */
export function getClientIp(req: Request): string {
  const forwarded =
    (req.headers as Headers).get("x-forwarded-for") ??
    (req.headers as Headers).get("x-real-ip");

  if (!forwarded) return "unknown";

  // x-forwarded-for may contain a comma-separated list; take the first entry.
  return forwarded.split(",")[0].trim();
}

/**
 * Returns `true` when the request should be blocked (rate limit exceeded).
 * Mutates the in-memory store to record the current attempt.
 */
export function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  const record = store.get(ip) ?? { timestamps: [] };

  // Slide the window: keep only timestamps inside the current window.
  record.timestamps = record.timestamps.filter((t) => t > windowStart);

  if (record.timestamps.length >= MAX_REQUESTS) {
    store.set(ip, record);
    return true;
  }

  record.timestamps.push(now);
  store.set(ip, record);

  // Cleanup: remove entries whose entire timestamp list has expired to prevent unbounded growth.
  for (const [key, rec] of store.entries()) {
    if (rec.timestamps.every((t) => t <= windowStart)) {
      store.delete(key);
    }
  }

  return false;
}

/**
 * Convenience helper: returns a 429 Response when rate-limited, or null
 * when the request is allowed through.
 */
export function rateLimitResponse(ip: string): Response | null {
  if (isRateLimited(ip)) {
    return new Response(
      JSON.stringify({ error: "Too many requests, please try again later" }),
      {
        status: 429,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
  return null;
}
