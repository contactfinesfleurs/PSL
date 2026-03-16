import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { Redis } from "@upstash/redis";
import { prisma } from "@/lib/prisma";
import "@/lib/env"; // validate required env vars at startup

// ---------------------------------------------------------------------------
// Redis client for Edge-compatible token blacklist (C-6)
// Lazily initialised — null when UPSTASH_REDIS_REST_URL/TOKEN are absent.
// ---------------------------------------------------------------------------
let _redisClient: Redis | null | undefined = undefined;

function getRedis(): Redis | null {
  if (_redisClient !== undefined) return _redisClient;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    _redisClient = null;
    return null;
  }
  _redisClient = new Redis({ url, token });
  return _redisClient;
}

const REVOKED_KEY_PREFIX = "psl:revoked:";

// Generated once per process start using Web Crypto API (Edge-runtime compatible).
// Sessions are invalidated on server restart which is acceptable in development.
const DEV_FALLBACK_SECRET = crypto.getRandomValues(new Uint8Array(32));

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  // Throw in any non-development environment (production, staging, preview, test…)
  // so that a missing JWT_SECRET never silently falls back to the random value.
  if (!secret && process.env.NODE_ENV !== "development") {
    throw new Error("JWT_SECRET environment variable must be set");
  }
  if (!secret) return DEV_FALLBACK_SECRET;
  return new TextEncoder().encode(secret);
}

const COOKIE_NAME = "psl_session";
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours for regular users
const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 1; // 1 hour for admin/super-admin accounts

// ─── Token payload ────────────────────────────────────────────────────────────

export type SessionPayload = {
  jti: string;
  profileId: string;
  email: string;
  name: string;
  role?: string;
  exp?: number;
  iat?: number;
};

// ─── Sign & verify ────────────────────────────────────────────────────────────

function isAdminRole(role?: string): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export async function signToken(payload: Omit<SessionPayload, "jti">): Promise<string> {
  const expiresIn = isAdminRole(payload.role) ? "1h" : "8h";
  const jti = crypto.randomUUID();
  return new SignJWT({ ...payload, jti } as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .setJti(jti)
    .sign(getJwtSecret());
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// ─── Token revocation ─────────────────────────────────────────────────────────

/**
 * Inserts a revoked token record so it can no longer be used.
 * Writes to both Prisma (authoritative, for Node handlers) and Redis
 * (for Edge middleware — C-6). Must be called on logout before clearing the cookie.
 */
export async function revokeToken(jti: string, expiresAt: Date): Promise<void> {
  const ttlSeconds = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));

  await Promise.all([
    prisma.revokedToken.create({ data: { jti, expiresAt } }),
    (async () => {
      const redis = getRedis();
      if (redis && ttlSeconds > 0) {
        await redis.set(`${REVOKED_KEY_PREFIX}${jti}`, "1", { ex: ttlSeconds });
      }
    })(),
  ]);
}

/**
 * Deletes expired revoked-token rows. Call periodically (e.g. from a cron job)
 * to prevent unbounded table growth.
 */
export async function cleanupExpiredTokens(): Promise<void> {
  await prisma.revokedToken.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}

// ─── Cookie helpers (Server Components / Route Handlers) ──────────────────────

/**
 * Returns the session for the current request.
 * Runs in Node runtime (Route Handlers / Server Components) — performs the
 * DB-backed blacklist check and tokensInvalidatedAt check (H-16).
 */
export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  // Parallel: check token blacklist (revoked on logout) + tokensInvalidatedAt (H-16)
  const [revoked, profile] = await Promise.all([
    payload.jti
      ? prisma.revokedToken.findUnique({ where: { jti: payload.jti } })
      : Promise.resolve(null),
    prisma.profile.findUnique({
      where: { id: payload.profileId },
      select: { tokensInvalidatedAt: true },
    }),
  ]);

  if (revoked) return null;

  // If the profile invalidated all tokens after this one was issued, reject it (H-16)
  if (profile?.tokensInvalidatedAt && payload.iat) {
    if (payload.iat * 1000 < profile.tokensInvalidatedAt.getTime()) {
      return null;
    }
  }

  return payload;
}

export async function setSessionCookie(token: string, role?: string) {
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: isAdminRole(role) ? ADMIN_COOKIE_MAX_AGE : COOKIE_MAX_AGE,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

// ─── Middleware helper (Edge runtime — reads from request) ────────────────────

/**
 * Lightweight session check for middleware (Edge runtime).
 * Verifies JWT signature and checks the Redis revocation blacklist (C-6).
 * Does NOT perform the Prisma DB check — that happens in getSession() only.
 */
export async function getSessionFromRequest(
  req: NextRequest
): Promise<SessionPayload | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  // Check Redis revocation blacklist (Edge-compatible — uses REST API)
  if (payload.jti) {
    const redis = getRedis();
    if (redis) {
      const revoked = await redis.get(`${REVOKED_KEY_PREFIX}${payload.jti}`);
      if (revoked) return null;
    }
  }

  return payload;
}

export { COOKIE_NAME, COOKIE_MAX_AGE, ADMIN_COOKIE_MAX_AGE };
