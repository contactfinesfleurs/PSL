import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

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
  profileId: string;
  email: string;
  name: string;
  role?: string;
};

// ─── Sign & verify ────────────────────────────────────────────────────────────

function isAdminRole(role?: string): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export async function signToken(payload: SessionPayload): Promise<string> {
  const expiresIn = isAdminRole(payload.role) ? "1h" : "8h";
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getJwtSecret());
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// ─── Cookie helpers (Server Components / Route Handlers) ──────────────────────

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function setSessionCookie(token: string, role?: string) {
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: isAdminRole(role) ? ADMIN_COOKIE_MAX_AGE : COOKIE_MAX_AGE,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

// ─── Middleware helper (Edge runtime — reads from request) ────────────────────

export async function getSessionFromRequest(
  req: NextRequest
): Promise<SessionPayload | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export { COOKIE_NAME, COOKIE_MAX_AGE, ADMIN_COOKIE_MAX_AGE };
