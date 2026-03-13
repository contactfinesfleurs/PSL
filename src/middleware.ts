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
  if (session) {
    const res = NextResponse.next();
    res.headers.set("x-profile-id", session.profileId);
    res.headers.set("x-profile-email", session.email);
    res.headers.set("x-profile-name", session.name);
    res.headers.set("x-profile-role", session.role ?? "MEMBER");
    return res;
  }

  // Permettre l'accès non authentifié à la page login et aux routes auth API
  if (pathname === "/login" || pathname.startsWith("/api/auth/")) {
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
