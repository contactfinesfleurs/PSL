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
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Toutes les routes sauf les fichiers statiques Next.js
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
