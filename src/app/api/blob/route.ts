import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { get } from "@vercel/blob";

export const dynamic = "force-dynamic";

/** Only Vercel Blob hostnames are accepted as `url` parameter values. */
function isVercelBlobUrl(raw: string): boolean {
  try {
    const { protocol, hostname } = new URL(raw);
    return (
      protocol === "https:" &&
      (hostname.endsWith(".vercel-storage.com") ||
        hostname.endsWith(".blob.vercel-storage.com"))
    );
  } catch {
    return false;
  }
}

/**
 * Authenticated proxy for private Vercel Blob files.
 *
 * Usage:  GET /api/blob?url=<encoded-blob-url>
 *
 * The route validates:
 *  1. The caller is authenticated (session cookie).
 *  2. The `url` parameter points to a Vercel Blob hostname.
 *
 * It then fetches the private blob server-side (using BLOB_READ_WRITE_TOKEN)
 * and streams the content back with private cache headers so the browser
 * never receives a permanent, unauthenticated link.
 */
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const blobUrl = req.nextUrl.searchParams.get("url");
  if (!blobUrl) {
    return NextResponse.json({ error: "Paramètre url manquant." }, { status: 400 });
  }

  if (!isVercelBlobUrl(blobUrl)) {
    return NextResponse.json({ error: "URL non autorisée." }, { status: 403 });
  }

  const result = await get(blobUrl, { access: "private" });

  if (!result) {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }

  // statusCode 304 means ETag matched — no stream available
  if (result.statusCode === 304 || !result.stream) {
    return new NextResponse(null, { status: 304 });
  }

  return new NextResponse(result.stream, {
    status: 200,
    headers: {
      "Content-Type": result.blob.contentType,
      // Prevent MIME sniffing
      "X-Content-Type-Options": "nosniff",
      // Private: browser may cache but must not share with other users
      "Cache-Control": "private, max-age=3600",
    },
  });
}
