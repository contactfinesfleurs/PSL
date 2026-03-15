import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import "@/lib/env"; // validate required env vars at startup

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
 * Must be called on logout before clearing the cookie.
 */
export async function revokeToken(jti: string, expiresAt: Date): Promise<void> {
  await prisma.revokedToken.create({ data: { jti, expiresAt } });
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
 * DB-backed blacklist check that cannot run in Edge middleware.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  // Check token blacklist (revoked on logout)
  if (payload.jti) {
    const revoked = await prisma.revokedToken.findUnique({
      where: { jti: payload.jti },
    });
    if (revoked) return null;
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
 * Does NOT perform the DB blacklist check — that happens in getSession() only.
 */
export async function getSessionFromRequest(
  req: NextRequest
): Promise<SessionPayload | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export { COOKIE_NAME, COOKIE_MAX_AGE, ADMIN_COOKIE_MAX_AGE };
