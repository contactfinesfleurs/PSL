/**
 * lib/storage.ts — Single source of truth for all file storage.
 *
 * Every file operation in the application MUST go through this module.
 * Do not import @vercel/blob's put/del/get directly in routes or components.
 *
 * ─── Why this file exists ───────────────────────────────────────────────────
 *
 * Files stored in this app are always private (user data). They must NEVER
 * be accessible without a valid session. This is enforced at two levels:
 *
 *  1. At rest  — Vercel Blob files are stored with access: "private".
 *  2. In transit — The raw blob URL is never sent to the browser. Instead,
 *     every stored path routes through an authenticated proxy:
 *       /api/blob?url=<encoded>   → production (Vercel Blob)
 *       /api/files/<folder>/...   → development (local filesystem)
 *
 * ─── Invariant (NEVER break this) ──────────────────────────────────────────
 *
 *   Every path written to the database MUST pass isStoredPath().
 *   Raw https://…vercel-storage.com/… URLs must NEVER be stored in the DB.
 *
 * ─── Adding a new file field to a model ────────────────────────────────────
 *
 *   1. Add the Prisma field (String? for single, String? for JSON array).
 *   2. On upload: call storeFile() → store the returned .path in the DB.
 *   3. On read: pass through safeParseArray() (arrays) or directly.
 *   4. On display: validate with isStoredPath() or isTrustedImageUrl().
 *   5. On delete: call deleteStoredFile() before removing the DB record.
 *
 * ─── Switching storage providers ────────────────────────────────────────────
 *
 *   Only storeFile() and deleteStoredFile() need to change. Route handlers,
 *   components and business logic are unaffected.
 */

import { put, del as blobDel, get as blobGet } from "@vercel/blob";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import "@/lib/env"; // validate required env vars at startup

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum upload size accepted by the /api/upload endpoint. */
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/** MIME types accepted for upload. Extend here if new formats are needed. */
export const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

/** MIME type map used by the local-dev file server (/api/files/[...path]). */
export const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
};

/**
 * Root directory for development uploads.
 * MUST be outside public/ so files are never served as static assets.
 * Only accessible through the authenticated /api/files/[...path] handler.
 */
export const UPLOADS_ROOT = path.resolve(process.cwd(), "private-uploads");

// ─── Path validation ──────────────────────────────────────────────────────────

/**
 * Returns true if `s` is a properly stored file path that routes through one
 * of our authenticated proxy endpoints.
 *
 * This is the CANONICAL check to use anywhere in the application.
 * All file paths written to the database MUST pass this check.
 *
 *   /api/blob?url=<encoded>  → production (private Vercel Blob)
 *   /api/files/<folder>/...  → development (local filesystem)
 */
export function isStoredPath(s: string): boolean {
  return s.startsWith("/api/blob?url=") || s.startsWith("/api/files/");
}

/**
 * Returns true if `raw` points to a Vercel Blob store hostname.
 *
 * Use this ONLY in:
 *   - The /api/blob proxy (to validate the `url` query parameter)
 *   - The migration script (to detect un-migrated public blob URLs)
 *
 * Do NOT use this to decide whether to trust a URL in business logic.
 * Use isStoredPath() instead.
 */
export function isVercelBlobHostname(raw: string): boolean {
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
 * Returns true for raw Vercel Blob URLs that pre-date the private migration
 * (i.e. stored directly as https://…vercel-storage.com/…).
 *
 * Used ONLY in isTrustedImageUrl() for legacy compatibility.
 * Remove this function (and its call site) once migrate-blobs-to-private
 * has been successfully run against production.
 *
 * @deprecated Remove after running npm run blob:migrate in production.
 */
export function isLegacyPublicBlobUrl(s: string): boolean {
  return isVercelBlobHostname(s);
}

// ─── Store a file ─────────────────────────────────────────────────────────────

export interface StoredFile {
  /**
   * The path to store in the database.
   * Always routes through an authenticated proxy — never a raw blob URL.
   * Always satisfies isStoredPath().
   */
  path: string;
  /**
   * The actual blob pathname or local filename.
   * For logging and migration only — do NOT store this in the database.
   */
  filename: string;
}

/**
 * Upload a file and return a proxied path ready to store in the database.
 *
 * In production (BLOB_READ_WRITE_TOKEN present):
 *   → Uploads to Vercel Blob with access: "private"
 *   → Returns /api/blob?url=<encoded-blob-url>
 *
 * In development (no token):
 *   → Saves to private-uploads/<folder>/<timestamp>_<filename>
 *   → Returns /api/files/<folder>/<timestamp>_<filename>
 *
 * Validates MIME type and file size as defense-in-depth (callers should also
 * validate before calling, but this ensures the invariant is always enforced).
 */
export async function storeFile(file: File, folder: string): Promise<StoredFile> {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error(`Type de fichier non autorisé : ${file.type}`);
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`Fichier trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024} Mo)`);
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, "_");
  const timestamp = Date.now();

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    // ── Production: Vercel Blob ──────────────────────────────────────────────
    const blobPathname = `${safeFolder}/${timestamp}_${safeName}`;
    const blob = await put(blobPathname, file, {
      access: "private",
      contentType: file.type,
    });
    return {
      path: `/api/blob?url=${encodeURIComponent(blob.url)}`,
      filename: blob.pathname,
    };
  }

  // ── Development: local filesystem ─────────────────────────────────────────
  const filename = `${timestamp}_${safeName}`;
  const uploadDir = path.resolve(UPLOADS_ROOT, safeFolder);

  // Guard against path traversal (e.g. folder = "../../etc")
  if (!uploadDir.startsWith(UPLOADS_ROOT + path.sep) && uploadDir !== UPLOADS_ROOT) {
    throw new Error("Chemin de dossier invalide.");
  }

  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), Buffer.from(await file.arrayBuffer()));

  return { path: `/api/files/${safeFolder}/${filename}`, filename };
}

// ─── Delete a stored file ─────────────────────────────────────────────────────

/**
 * Delete a file by its stored path.
 * Accepts both /api/blob?url=<encoded> and /api/files/<...> paths.
 * Silently ignores paths that don't match a known format.
 */
export async function deleteStoredFile(storedPath: string): Promise<void> {
  if (storedPath.startsWith("/api/blob?url=")) {
    const encoded = storedPath.slice("/api/blob?url=".length);
    const blobUrl = decodeURIComponent(encoded);
    await blobDel(blobUrl);
    return;
  }

  if (storedPath.startsWith("/api/files/")) {
    const relative = storedPath.slice("/api/files/".length);
    const resolved = path.resolve(UPLOADS_ROOT, relative);
    // Path traversal guard
    if (!resolved.startsWith(UPLOADS_ROOT + path.sep)) return;
    await unlink(resolved).catch(() => {
      /* ignore ENOENT */
    });
  }
}

// ─── Fetch a stored file (server-side only) ───────────────────────────────────

export type BlobFetchResult =
  | { ok: false; status: number }
  | { ok: true; stream: ReadableStream; contentType: string; statusCode: number };

/**
 * Fetch the raw content of a private Vercel Blob file server-side.
 * Only works for /api/blob?url=<encoded> paths (production mode).
 * Used by the /api/blob proxy route.
 */
export async function fetchBlobContent(blobUrl: string): Promise<BlobFetchResult> {
  const result = await blobGet(blobUrl, { access: "private" });
  if (!result) return { ok: false, status: 404 };
  return {
    ok: true,
    stream: result.stream as ReadableStream,
    contentType: result.blob.contentType ?? "application/octet-stream",
    statusCode: result.statusCode,
  };
}
