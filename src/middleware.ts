import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

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

  // Derive the expected origin from the public app URL if configured,
  // falling back to the request's own origin (reliable in edge runtime).
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const expected = appUrl
    ? (() => {
        try {
          return new URL(appUrl).origin;
        } catch {
          return req.nextUrl.origin;
        }
      })()
    : req.nextUrl.origin;

  return origin === expected;
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

  // Laisser passer les assets statiques et le tunnel Sentry
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/monitoring"
  ) {
    return NextResponse.next();
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
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Permettre l'accès non authentifié à la page login, aux routes auth API
  // et aux routes de partage public (code uniquement, pas de session)
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/share/") ||
    pathname.startsWith("/share/")
  ) {
    return NextResponse.next();
  }

  // Rediriger les utilisateurs non authentifiés vers /login
  // On ne transmet "from" que si c'est un chemin relatif (pas une URL absolue)
  // pour éviter un open redirect.
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  if (pathname.startsWith("/") && !pathname.startsWith("//")) {
    loginUrl.searchParams.set("from", pathname);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // Toutes les routes sauf les fichiers statiques Next.js
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
