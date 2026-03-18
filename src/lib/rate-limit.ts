/**
 * In-memory sliding window rate limiter.
 * No external dependencies required.
 *
 * Default limits: max 5 requests per IP within a 15-minute window.
 * Pass a custom `RateLimitOptions` to override per call-site.
 */

export interface RateLimitOptions {
  /** Duration of the sliding window in milliseconds. Default: 15 min. */
  windowMs?: number;
  /** Maximum requests allowed per IP per window. Default: 5. */
  max?: number;
  /**
   * Optional namespace prefix so different call-sites maintain independent
   * counters for the same IP (e.g. "auth:" vs "upload:").
   */
  prefix?: string;
}

const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_MAX = 5;

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
 *
 * @param ip     Client identifier (usually IP address)
 * @param opts   Optional window/max/prefix overrides
 */
export function isRateLimited(ip: string, opts?: RateLimitOptions): boolean {
  const windowMs = opts?.windowMs ?? DEFAULT_WINDOW_MS;
  const max = opts?.max ?? DEFAULT_MAX;
  const key = opts?.prefix ? `${opts.prefix}${ip}` : ip;

  const now = Date.now();
  const windowStart = now - windowMs;

  const record = store.get(key) ?? { timestamps: [] };

  // Slide the window: keep only timestamps inside the current window.
  record.timestamps = record.timestamps.filter((t) => t > windowStart);

  if (record.timestamps.length >= max) {
    store.set(key, record);
    return true;
  }

  record.timestamps.push(now);
  store.set(key, record);

  // Cleanup: remove entries whose entire timestamp list has expired to prevent unbounded growth.
  for (const [k, rec] of store.entries()) {
    if (rec.timestamps.every((t) => t <= windowStart)) {
      store.delete(k);
    }
  }

  return false;
}

/**
 * Convenience helper: returns a 429 Response when rate-limited, or null
 * when the request is allowed through.
 *
 * @param ip     Client identifier (usually IP address)
 * @param opts   Optional window/max/prefix overrides
 */
export function rateLimitResponse(ip: string, opts?: RateLimitOptions): Response | null {
  if (isRateLimited(ip, opts)) {
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
