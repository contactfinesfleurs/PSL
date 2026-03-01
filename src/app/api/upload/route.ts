import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const dynamic = 'force-dynamic';

const ALLOWED_FOLDERS = new Set(["sketches", "techpacks", "samples", "packshots", "general"]);

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const folderRaw = (formData.get("folder") as string | null) ?? "general";

  if (!file) {
    return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
  }

  // Validate folder against strict allowlist (prevents path traversal)
  const folder = folderRaw.trim().toLowerCase();
  if (!ALLOWED_FOLDERS.has(folder)) {
    return NextResponse.json({ error: "Dossier non autorisé" }, { status: 400 });
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 20 Mo)" }, { status: 413 });
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Type de fichier non autorisé" }, { status: 415 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const timestamp = Date.now();

  // Use Vercel Blob in production, local filesystem in development
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const filename = `${folder}/${timestamp}_${safeName}`;
      const blob = await put(filename, file, { access: "public" });
      return NextResponse.json({ path: blob.url, filename: blob.pathname });
    } catch {
      return NextResponse.json({ error: "Erreur lors de l'upload" }, { status: 500 });
    }
  }

  // Local development fallback
  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `${timestamp}_${safeName}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads", folder);

    // Verify the resolved path stays within the expected uploads directory
    const resolvedUploadDir = path.resolve(uploadDir);
    const allowedBase = path.resolve(process.cwd(), "public", "uploads");
    if (!resolvedUploadDir.startsWith(allowedBase)) {
      return NextResponse.json({ error: "Chemin non autorisé" }, { status: 400 });
    }

    await mkdir(resolvedUploadDir, { recursive: true });
    const filePath = path.join(resolvedUploadDir, filename);
    await writeFile(filePath, buffer);

    const publicPath = `/uploads/${folder}/${filename}`;
    return NextResponse.json({ path: publicPath, filename });
  } catch {
    return NextResponse.json({ error: "Erreur lors de l'upload" }, { status: 500 });
  }
}
