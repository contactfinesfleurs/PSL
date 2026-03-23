import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

// Routes publiques qui ne nécessitent pas d'authentification
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/register",
  "/api/dev/init",
];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Laisser passer les assets statiques
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // Construire les headers de la requête en supprimant les x-profile-* entrants
  // pour éviter toute usurpation d'identité côté client
  const requestHeaders = new Headers(req.headers);
  requestHeaders.delete("x-profile-id");
  requestHeaders.delete("x-profile-email");
  requestHeaders.delete("x-profile-name");

  const session = await getSessionFromRequest(req);

  if (!session) {
    // Rediriger vers /login si la route est protégée
    if (!isPublic(pathname)) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.search = `?from=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Injecter les infos de session dans les headers de la requête
  // (pour les Route Handlers — pas dans la réponse navigateur)
  requestHeaders.set("x-profile-id", session.profileId);
  requestHeaders.set("x-profile-email", session.email);
  requestHeaders.set("x-profile-name", session.name);

  // Si connecté et tente d'accéder à /login, rediriger vers /
  if (pathname === "/login") {
    const homeUrl = req.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    // Toutes les routes sauf les fichiers statiques Next.js
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
