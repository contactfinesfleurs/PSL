import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

// ---------------------------------------------------------------------------
// CSP nonce helpers
// ---------------------------------------------------------------------------
function generateNonce(): string {
  // btoa + randomUUID are both available in the Edge Runtime
  return btoa(crypto.randomUUID());
}

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    // nonce-{nonce}: trusts only scripts with this nonce attribute
    // 'strict-dynamic': extends trust to scripts loaded by nonce-trusted scripts
    // 'unsafe-inline': ignored by modern browsers when strict-dynamic is present,
    //   kept as fallback for browsers that don't support nonces
    `script-src 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline'`,
    // style attributes (React inline styles) always require 'unsafe-inline'
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

// ---------------------------------------------------------------------------
// CORS / CSRF — Origin header validation
// ---------------------------------------------------------------------------
// For state-changing API requests (POST/PUT/PATCH/DELETE) we verify that the
// Origin header, when present, matches the application's own origin.
// This provides a server-side CSRF guard that complements the SameSite=lax
// cookie attribute: even if a browser sends the cookie, a cross-origin request
// is rejected before it reaches the route handler.
//
// Requests without an Origin header are allowed (server-to-server calls,
// curl, etc.) — those callers cannot possess the HttpOnly session cookie.
function isAllowedOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // no Origin → not a cross-origin browser request

  // 1. Check against NEXT_PUBLIC_APP_URL if configured
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      if (origin === new URL(appUrl).origin) return true;
    } catch { /* ignore invalid URL */ }
  }

  // 2. Check against the Host header (most reliable on Vercel where
  //    req.nextUrl.origin can differ from the public-facing domain).
  const host = req.headers.get("host");
  if (host) {
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const hostOrigin = `${proto}://${host}`;
    if (origin === hostOrigin) return true;
  }

  // 3. Fallback to req.nextUrl.origin
  return origin === req.nextUrl.origin;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Reject state-changing cross-origin requests on all API routes.
  // OPTIONS preflight requests are allowed through so browsers can inspect
  // CORS headers (the absence of Allow-Origin headers will block them anyway).
  if (
    pathname.startsWith("/api/") &&
    ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
    !isAllowedOrigin(req)
  ) {
    console.warn(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "SECURITY",
        event: "CSRF_ORIGIN_REJECTED",
        origin: req.headers.get("origin"),
        path: pathname,
        method: req.method,
      })
    );
    return new NextResponse(
      JSON.stringify({ error: "Cross-origin request rejected" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  // Generate a per-request nonce for CSP. Next.js automatically reads
  // x-nonce from request headers and adds it to its own inline scripts.
  const nonce = generateNonce();
  const csp = buildCsp(nonce);

  // Laisser passer les assets statiques et le tunnel Sentry
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/monitoring"
  ) {
    return NextResponse.next();
  }

  // En mode bêta, la landing page est masquée — on redirige vers /login.
  if (process.env.BETA_MODE === "true" && pathname === "/landing") {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  const session = await getSessionFromRequest(req);

  // Si connecté, transmettre le profileId dans les headers pour les Route Handlers
  // On écrase les headers de la *requête* (pas seulement de la réponse) pour empêcher
  // un client malveillant d'injecter ses propres valeurs x-profile-*.
  if (session) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-profile-id", session.profileId);
    requestHeaders.set("x-profile-email", session.email);
    requestHeaders.set("x-profile-name", session.name);
    requestHeaders.set("x-profile-role", session.role ?? "MEMBER");
    requestHeaders.set("x-profile-plan", session.plan ?? "FREE");
    requestHeaders.set("x-nonce", nonce);
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.headers.set("Content-Security-Policy", csp);
    return res;
  }

  // Permettre l'accès non authentifié à la page login, aux routes auth API
  // et aux routes de partage public (code uniquement, pas de session)
  if (
    pathname === "/login" ||
    pathname === "/landing" ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/share/") ||
    pathname === "/api/stripe/webhook" ||
    pathname.startsWith("/share/")
  ) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-nonce", nonce);
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.headers.set("Content-Security-Policy", csp);
    return res;
  }

  // Rediriger les utilisateurs non authentifiés vers /login
  // On ne transmet "from" que si c'est un chemin relatif sûr : aucun protocole,
  // aucun hostname, pas de chemin commençant par // (ex. //evil.com).
  // La regex n'autorise que les caractères valides dans un chemin URL (RFC 3986).
  const SAFE_PATH_RE = /^\/[a-zA-Z0-9\-._~!$&'()*+,;=:@/]*$/;
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  if (SAFE_PATH_RE.test(pathname)) {
    loginUrl.searchParams.set("from", pathname);
  }
  const res = NextResponse.redirect(loginUrl);
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

export const config = {
  matcher: [
    // Toutes les routes sauf les fichiers statiques Next.js
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
