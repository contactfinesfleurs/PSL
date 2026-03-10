import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

// Routes publiques (pas de session requise)
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/register"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Laisser passer les assets statiques et les routes publiques
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
  ) {
    return NextResponse.next();
  }

  const session = await getSessionFromRequest(req);

  // Pas authentifié → redirection selon le type de requête
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authentifié → transmettre le profileId dans les headers pour les Route Handlers
  const res = NextResponse.next();
  res.headers.set("x-profile-id", session.profileId);
  res.headers.set("x-profile-email", session.email);
  res.headers.set("x-profile-name", session.name);

  return res;
}

export const config = {
  matcher: [
    // Toutes les routes sauf les fichiers statiques Next.js
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
