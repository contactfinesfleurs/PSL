import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

// Routes publiques (pas de session requise)
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/register", "/api/dev/init"];

// Profil dev utilisé quand BYPASS_AUTH=1
const DEV_PROFILE_ID = "dev-bypass-profile-001";
const DEV_PROFILE_EMAIL = "dev@psl.local";
const DEV_PROFILE_NAME = "Développeur";

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

  // Mode bypass dev : BYPASS_AUTH=1 → session fictive injectée
  if (process.env.BYPASS_AUTH === "1") {
    const res = NextResponse.next();
    res.headers.set("x-profile-id", DEV_PROFILE_ID);
    res.headers.set("x-profile-email", DEV_PROFILE_EMAIL);
    res.headers.set("x-profile-name", DEV_PROFILE_NAME);
    return res;
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
