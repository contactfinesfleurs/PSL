import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

// Routes that don't require authentication
const PUBLIC_PATHS = ["/login", "/api/auth/", "/api/docs"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p));
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
