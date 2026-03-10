import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

// ─── Security constants ────────────────────────────────────────────────────

/** Maximum upload size: 10 MB */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Strict MIME type whitelist — images and PDF only */
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

// Resolved once at module load — stable for the lifetime of the server process.
// Files are stored OUTSIDE the Next.js public/ directory so they are never served
// as static assets. They are only accessible through the authenticated
// /api/files/[...path] route handler.
const UPLOADS_ROOT = path.resolve(process.cwd(), "private-uploads");

// ─── Handler ───────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const rawFolder = (formData.get("folder") as string) || "general";

  if (!file) {
    return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
  }

  // Validate MIME type against whitelist
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Type de fichier non autorisé. Formats acceptés : JPEG, PNG, WebP, GIF, PDF." },
      { status: 415 }
    );
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Fichier trop volumineux. Taille maximale : 10 Mo." },
      { status: 413 }
    );
  }

  // Sanitize folder name — strip anything that isn't alphanumeric, hyphen or underscore
  const folder = rawFolder.replace(/[^a-zA-Z0-9_-]/g, "_");

  // Sanitize filename — preserve extension, strip dangerous characters
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const timestamp = Date.now();

  try {
    // ── Production: Vercel Blob ────────────────────────────────────────────
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const filename = `${folder}/${timestamp}_${safeName}`;
      const blob = await put(filename, file, {
        access: "public",
        contentType: file.type, // Explicitly declare — don't rely on client header
      });
      return NextResponse.json({ path: blob.url, filename: blob.pathname });
    }

    // ── Development: local filesystem ─────────────────────────────────────
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `${timestamp}_${safeName}`;

    // Guard against path traversal (e.g. folder = "../../etc")
    const uploadDir = path.resolve(UPLOADS_ROOT, folder);

    if (!uploadDir.startsWith(UPLOADS_ROOT + path.sep) && uploadDir !== UPLOADS_ROOT) {
      return NextResponse.json({ error: "Chemin invalide." }, { status: 400 });
    }

    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);

    return NextResponse.json({ path: `/api/files/${folder}/${filename}`, filename });
  } catch {
    return NextResponse.json({ error: "Erreur lors de l'upload." }, { status: 500 });
  }
}
