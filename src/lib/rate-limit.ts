/**
 * Sliding window rate limiter.
 *
 * - Production / multi-instance: uses Upstash Redis when UPSTASH_REDIS_REST_URL
 *   and UPSTASH_REDIS_REST_TOKEN are set. Counters are shared across all
 *   serverless instances so limits are enforced globally.
 *
 * - Development / single-instance fallback: in-memory Map when Upstash env
 *   vars are absent.
 *
 * Limits: max 5 requests per key within a 15-minute sliding window.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 5;

// ---------------------------------------------------------------------------
// In-memory fallback (single-process / dev)
// ---------------------------------------------------------------------------

interface RequestRecord {
  timestamps: number[];
}

const store = new Map<string, RequestRecord>();

function isRateLimitedMemory(key: string): boolean {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  const record = store.get(key) ?? { timestamps: [] };
  record.timestamps = record.timestamps.filter((t) => t > windowStart);

  if (record.timestamps.length >= MAX_REQUESTS) {
    store.set(key, record);
    return true;
  }

  record.timestamps.push(now);
  store.set(key, record);

  // Cleanup: remove fully-expired entries to prevent unbounded growth.
  for (const [k, rec] of store.entries()) {
    if (rec.timestamps.every((t) => t <= windowStart)) {
      store.delete(k);
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// Upstash Redis rate limiter (multi-instance / prod)
// ---------------------------------------------------------------------------

let _upstashLimiter: Ratelimit | null = null;

function getUpstashLimiter(): Ratelimit | null {
  if (_upstashLimiter) return _upstashLimiter;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  _upstashLimiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(MAX_REQUESTS, "15 m"),
    prefix: "psl:rl",
  });

  return _upstashLimiter;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

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
 * Uses Upstash Redis in production, in-memory Map in development.
 */
export async function isRateLimited(key: string): Promise<boolean> {
  const limiter = getUpstashLimiter();
  if (limiter) {
    const { success } = await limiter.limit(key);
    return !success;
  }
  return isRateLimitedMemory(key);
}

/**
 * Convenience helper: returns a 429 Response when rate-limited, or null
 * when the request is allowed through.
 */
export async function rateLimitResponse(key: string): Promise<Response | null> {
  if (await isRateLimited(key)) {
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
