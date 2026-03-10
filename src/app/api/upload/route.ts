import { NextRequest, NextResponse } from "next/server";
import { MAX_FILE_SIZE, ALLOWED_MIME_TYPES, storeFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const folder = (formData.get("folder") as string) || "general";

  if (!file) {
    return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Type de fichier non autorisé. Formats acceptés : JPEG, PNG, WebP, GIF, PDF." },
      { status: 415 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Fichier trop volumineux. Taille maximale : 10 Mo." },
      { status: 413 }
    );
  }

  try {
    const stored = await storeFile(file, folder);
    return NextResponse.json(stored);
  } catch {
    return NextResponse.json({ error: "Erreur lors de l'upload." }, { status: 500 });
  }
}
