/**
 * Sliding window rate limiter with configurable tiers.
 *
 * Tiers:
 *  - "strict"   →  5 requests / 15 min  (login, register)
 *  - "moderate" → 20 requests / 15 min  (upload, share contributions, invitations)
 *  - "loose"    → 60 requests / 15 min  (admin reads, general API)
 *
 * - Production / multi-instance: uses Upstash Redis when UPSTASH_REDIS_REST_URL
 *   and UPSTASH_REDIS_REST_TOKEN are set. Counters are shared across all
 *   serverless instances so limits are enforced globally.
 *
 * - Development / single-instance fallback: in-memory Map when Upstash env
 *   vars are absent.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { logSecurityEvent } from "@/lib/audit";

// ---------------------------------------------------------------------------
// Tier definitions
// ---------------------------------------------------------------------------

export type RateLimitTier = "strict" | "moderate" | "loose";

const TIER_CONFIG: Record<RateLimitTier, { max: number; windowMs: number; windowStr: string }> = {
  strict:   { max: 5,  windowMs: 15 * 60 * 1000, windowStr: "15 m" },
  moderate: { max: 20, windowMs: 15 * 60 * 1000, windowStr: "15 m" },
  loose:    { max: 60, windowMs: 15 * 60 * 1000, windowStr: "15 m" },
};

// ---------------------------------------------------------------------------
// In-memory fallback (single-process / dev)
// ---------------------------------------------------------------------------

interface RequestRecord {
  timestamps: number[];
}

const store = new Map<string, RequestRecord>();

function isRateLimitedMemory(key: string, tier: RateLimitTier): boolean {
  const { max, windowMs } = TIER_CONFIG[tier];
  const now = Date.now();
  const windowStart = now - windowMs;

  const record = store.get(key) ?? { timestamps: [] };
  record.timestamps = record.timestamps.filter((t) => t > windowStart);

  if (record.timestamps.length >= max) {
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

const _upstashLimiters = new Map<RateLimitTier, Ratelimit>();

function getUpstashLimiter(tier: RateLimitTier): Ratelimit | null {
  if (_upstashLimiters.has(tier)) return _upstashLimiters.get(tier)!;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const { max, windowStr } = TIER_CONFIG[tier];
  const limiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(max, windowStr as Parameters<typeof Ratelimit.slidingWindow>[1]),
    prefix: `psl:rl:${tier}`,
  });

  _upstashLimiters.set(tier, limiter);
  return limiter;
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
export async function isRateLimited(
  key: string,
  tier: RateLimitTier = "strict"
): Promise<boolean> {
  const limiter = getUpstashLimiter(tier);
  if (limiter) {
    const { success } = await limiter.limit(key);
    return !success;
  }
  return isRateLimitedMemory(key, tier);
}

/**
 * Convenience helper: returns a 429 Response when rate-limited, or null
 * when the request is allowed through. Logs a security event on block.
 */
export async function rateLimitResponse(
  key: string,
  tier: RateLimitTier = "strict"
): Promise<Response | null> {
  if (await isRateLimited(key, tier)) {
    logSecurityEvent("RATE_LIMIT_HIT", null, { key, tier });
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

// ---------------------------------------------------------------------------
// Custom window rate limiter (arbitrary max / windowMs)
// ---------------------------------------------------------------------------

// Separate store for custom-limit entries to avoid collisions with tier store.
const customStore = new Map<string, RequestRecord>();

/**
 * Returns `true` when the key has exceeded `max` requests within `windowMs`.
 * Uses the in-memory store (same fallback strategy as isRateLimited).
 * In production with Upstash configured, falls back to in-memory because
 * custom windows cannot be expressed as Upstash tier strings — callers should
 * pair this with a tier-based check for cross-instance accuracy.
 */
export function isRateLimitedCustom(
  key: string,
  max: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;

  const record = customStore.get(key) ?? { timestamps: [] };
  record.timestamps = record.timestamps.filter((t) => t > windowStart);

  if (record.timestamps.length >= max) {
    customStore.set(key, record);
    return true;
  }

  record.timestamps.push(now);
  customStore.set(key, record);

  // Cleanup fully-expired entries.
  for (const [k, rec] of customStore.entries()) {
    if (rec.timestamps.every((t) => t <= windowStart)) {
      customStore.delete(k);
    }
  }

  return false;
}
