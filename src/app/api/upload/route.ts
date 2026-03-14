import { NextRequest, NextResponse } from "next/server";
import { MAX_FILE_SIZE, ALLOWED_MIME_TYPES, storeFile } from "@/lib/storage";
import { getProfileId, unauthorizedResponse } from "@/lib/api-helpers";
import { getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const limited = rateLimitResponse(getClientIp(req));
  if (limited) return limited;

  // Defense-in-depth: middleware already enforces auth, but we check here too
  // so a future middleware misconfiguration doesn't silently expose this endpoint.
  const profileId = getProfileId(req);
  if (!profileId) return unauthorizedResponse();

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
