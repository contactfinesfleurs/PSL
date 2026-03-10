import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { UPLOADS_ROOT, MIME_BY_EXT } from "@/lib/storage";
import { readFile } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * Authenticated file server for development-mode local uploads.
 *
 * Files are stored outside public/ so they are never served as static assets.
 * This handler checks the session and guards against path traversal before
 * reading and streaming the file.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { path: segments } = await params;

  // Reconstruct and resolve the requested file path, then guard against
  // path-traversal attacks (e.g. ../../etc/passwd)
  const requested = path.resolve(UPLOADS_ROOT, ...segments);
  if (!requested.startsWith(UPLOADS_ROOT + path.sep) && requested !== UPLOADS_ROOT) {
    return NextResponse.json({ error: "Chemin invalide." }, { status: 400 });
  }

  const ext = path.extname(requested).slice(1).toLowerCase();
  const contentType = MIME_BY_EXT[ext];
  if (!contentType) {
    return NextResponse.json({ error: "Type de fichier non autorisé." }, { status: 415 });
  }

  try {
    const buffer = await readFile(requested);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }
}
