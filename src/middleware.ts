import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

// Routes that don't require authentication
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/register", "/api/auth/2fa/validate", "/api/docs"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p));
}

// ─── Global rate limiter for mutating requests (Edge-compatible) ────────────
const GLOBAL_WINDOW_MS = 60_000; // 1 minute
const GLOBAL_MAX_REQUESTS = 60; // 60 writes per minute per IP

const globalStore = new Map<string, { timestamps: number[] }>();

function getIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim()
    ?? req.headers.get("x-real-ip")
    ?? "unknown";
}

function isGlobalRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - GLOBAL_WINDOW_MS;
  const record = globalStore.get(ip) ?? { timestamps: [] };

  record.timestamps = record.timestamps.filter((t) => t > windowStart);

  if (record.timestamps.length >= GLOBAL_MAX_REQUESTS) {
    globalStore.set(ip, record);
    return true;
  }

  record.timestamps.push(now);
  globalStore.set(ip, record);

  // Cleanup stale entries periodically
  if (globalStore.size > 10_000) {
    for (const [key, rec] of globalStore.entries()) {
      if (rec.timestamps.every((t) => t <= windowStart)) {
        globalStore.delete(key);
      }
    }
  }

  return false;
}

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Laisser passer les assets statiques
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // Global rate limit on all mutating API requests
  if (pathname.startsWith("/api/") && MUTATING_METHODS.has(req.method)) {
    const ip = getIp(req);
    if (isGlobalRateLimited(ip)) {
      console.warn(`[RATE-LIMIT] ${req.method} ${pathname} blocked for IP ${ip}`);
      return NextResponse.json(
        { error: "Too many requests, please try again later" },
        { status: 429 }
      );
    }

    // CSRF defense-in-depth: validate Origin header on mutating API requests.
    // SameSite=lax cookies already block most cross-origin attacks, but this
    // catches edge cases (old browsers, subdomain attacks, misconfigured proxies).
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (origin && host) {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          console.warn(`[CSRF] Blocked cross-origin ${req.method} ${pathname} from ${origin} (host: ${host})`);
          return NextResponse.json(
            { error: "Cross-origin request rejected" },
            { status: 403 }
          );
        }
      } catch {
        // Malformed origin header — block it
        return NextResponse.json(
          { error: "Invalid origin" },
          { status: 403 }
        );
      }
    }
  }

  const session = await getSessionFromRequest(req);

  // Si connecté, transmettre le profileId dans les headers pour les Route Handlers
  if (session) {
    // Redirect authenticated users away from login page
    if (pathname === "/login") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    const res = NextResponse.next();
    res.headers.set("x-profile-id", session.profileId);
    return res;
  }

  // Non authentifié sur une route protégée
  if (!isPublicPath(pathname)) {
    // API routes: return 401 JSON (fetch clients can't follow redirects)
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    // Page routes: redirect to login
    const loginUrl = new URL("/login", req.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("from", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Toutes les routes sauf les fichiers statiques Next.js
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
