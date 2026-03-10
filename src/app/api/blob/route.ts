import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { isVercelBlobHostname, fetchBlobContent } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Authenticated proxy for private Vercel Blob files.
 *
 * Usage:  GET /api/blob?url=<encoded-blob-url>
 *
 * The raw Vercel Blob URL is never sent to the browser — it would be a
 * permanent, unauthenticated link. This route validates the session, checks
 * that the URL points to a Vercel Blob hostname, fetches the file server-side
 * and streams it back with private cache headers.
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

  if (!isVercelBlobHostname(blobUrl)) {
    return NextResponse.json({ error: "URL non autorisée." }, { status: 403 });
  }

  const result = await fetchBlobContent(blobUrl);

  if (!result.ok) {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: result.status });
  }

  // 304 Not Modified — ETag matched, no stream available
  if (result.statusCode === 304 || !result.stream) {
    return new NextResponse(null, { status: 304 });
  }

  return new NextResponse(result.stream, {
    status: 200,
    headers: {
      "Content-Type": result.contentType,
      // Prevent MIME sniffing
      "X-Content-Type-Options": "nosniff",
      // Private: browser may cache but must not share with other users
      "Cache-Control": "private, max-age=3600",
    },
  });
}
