import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { readFile } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

// Resolved once at module load — must match the root used by the upload handler.
const UPLOADS_ROOT = path.resolve(process.cwd(), "private-uploads");

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  // Require authentication
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
        // Prevent browsers from sniffing the MIME type
        "X-Content-Type-Options": "nosniff",
        // Files are user-specific — do not store in shared caches
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }
}
