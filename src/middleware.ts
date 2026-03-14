import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Laisser passer les assets statiques
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
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
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // Toutes les routes sauf les fichiers statiques Next.js
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
