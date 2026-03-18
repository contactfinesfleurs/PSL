import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

// Headers injected by this middleware.
// They MUST be stripped from every incoming request so a malicious client
// cannot spoof a session by sending them directly.
const SESSION_HEADERS = ["x-profile-id", "x-profile-email", "x-profile-name"] as const;

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Laisser passer les assets statiques
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // Build a clean copy of request headers, removing any client-supplied
  // x-profile-* values unconditionally to prevent header-spoofing attacks.
  const requestHeaders = new Headers(req.headers);
  for (const h of SESSION_HEADERS) {
    requestHeaders.delete(h);
  }

  const session = await getSessionFromRequest(req);

  // If authenticated, inject verified session data into the request headers
  // so Route Handlers can read them via getProfileId() without re-verifying the JWT.
  if (session) {
    requestHeaders.set("x-profile-id", session.profileId);
    requestHeaders.set("x-profile-email", session.email);
    requestHeaders.set("x-profile-name", session.name);
  }

  // Pass the modified request headers to the downstream handler.
  // Using `request: { headers }` is the only correct way to forward headers
  // to Route Handlers — setting them on `res.headers` would only send them
  // to the browser, not to the server-side handler.
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    // Toutes les routes sauf les fichiers statiques Next.js
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
