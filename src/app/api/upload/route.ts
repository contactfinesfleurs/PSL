import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const folder = (formData.get("folder") as string) || "general";

  if (!file) {
    return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
  }

  // Use Vercel Blob in production, local filesystem in development
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const timestamp = Date.now();
    const filename = `${folder}/${timestamp}_${safeName}`;

    const blob = await put(filename, file, { access: "public" });

    return NextResponse.json({ path: blob.url, filename: blob.pathname });
  }

  // Local development fallback
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const timestamp = Date.now();
  const filename = `${timestamp}_${safeName}`;

  const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(uploadDir, { recursive: true });

  const filePath = path.join(uploadDir, filename);
  await writeFile(filePath, buffer);

  const publicPath = `/uploads/${folder}/${filename}`;

  return NextResponse.json({ path: publicPath, filename });
}
