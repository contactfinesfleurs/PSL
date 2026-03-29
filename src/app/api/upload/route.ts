import { NextRequest, NextResponse } from "next/server";
import { MAX_FILE_SIZE, ALLOWED_MIME_TYPES, storeFile } from "@/lib/storage";
import { getProfileId, unauthorizedResponse } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

// Magic bytes for file type verification (prevents MIME spoofing)
// Magic bytes for file type verification (prevents MIME spoofing).
// Each entry checks primary bytes + optional secondary bytes at a different offset.
const MAGIC_BYTES: { mime: string; bytes: number[]; offset?: number; extra?: { bytes: number[]; offset: number } }[] = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  // WebP: RIFF header at 0 + "WEBP" at offset 8 (distinguishes from WAV/AVI which also use RIFF)
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46], extra: { bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 } },
  { mime: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38] }, // GIF8 (matches GIF87a and GIF89a)
  { mime: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
];

function verifyMagicBytes(buffer: ArrayBuffer, claimedMime: string): boolean {
  const view = new Uint8Array(buffer);
  const expected = MAGIC_BYTES.find((m) => m.mime === claimedMime);
  if (!expected) return false;
  const offset = expected.offset ?? 0;
  if (view.length < offset + expected.bytes.length) return false;
  const primaryMatch = expected.bytes.every((b, i) => view[offset + i] === b);
  if (!primaryMatch) return false;
  // Check secondary bytes (e.g. WEBP signature at offset 8)
  if (expected.extra) {
    const { bytes: extraBytes, offset: extraOffset } = expected.extra;
    if (view.length < extraOffset + extraBytes.length) return false;
    return extraBytes.every((b, i) => view[extraOffset + i] === b);
  }
  return true;
}

export async function POST(req: NextRequest) {
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

  // Verify file content matches claimed MIME type (prevents MIME spoofing)
  const buffer = await file.arrayBuffer();
  if (!verifyMagicBytes(buffer, file.type)) {
    return NextResponse.json(
      { error: "Le contenu du fichier ne correspond pas au type déclaré." },
      { status: 415 }
    );
  }

  try {
    const stored = await storeFile(file, folder);
    return NextResponse.json(stored);
  } catch {
    return NextResponse.json({ error: "Erreur lors de l'upload." }, { status: 500 });
  }
}
