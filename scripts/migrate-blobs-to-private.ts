/**
 * scripts/migrate-blobs-to-private.ts
 *
 * Migrates all existing public Vercel Blob files to private access and updates
 * every database reference to route through the authenticated /api/blob proxy.
 *
 * Usage:
 *   BLOB_READ_WRITE_TOKEN=<token> DATABASE_URL=<url> tsx scripts/migrate-blobs-to-private.ts
 *   # or: npx dotenv -e .env.local -- tsx scripts/migrate-blobs-to-private.ts
 *
 * What it does:
 *  1. Scans the DB for raw Vercel Blob URLs (https://…vercel-storage.com/…)
 *     in Product.sketchPaths, Product.techPackPath, Sample.*PhotoPaths,
 *     Sample.packshotPaths, MediaPlacement.screenshotPath.
 *  2. For each unique public URL: copies the blob to a new private version
 *     using the Vercel Blob copy() API (no download/re-upload needed).
 *  3. Replaces all occurrences of the old URL in the DB with the new
 *     /api/blob?url=<encoded> proxied path.
 *  4. Deletes the old public blob.
 *
 * The script is idempotent: it skips any path that already starts with
 * "/api/blob" (already migrated).
 *
 * Run with --dry-run to preview changes without writing to DB or Blob.
 */

import { PrismaClient } from "@prisma/client";
import { copy, del, list } from "@vercel/blob";

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isRawVercelBlobUrl(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    return (
      protocol === "https:" &&
      (hostname.endsWith(".vercel-storage.com") ||
        hostname.endsWith(".blob.vercel-storage.com"))
    );
  } catch {
    return false;
  }
}

function toProxiedPath(privateUrl: string): string {
  return `/api/blob?url=${encodeURIComponent(privateUrl)}`;
}

/** Parse a nullable JSON-array field into string[], returns [] on null/invalid. */
function parseJsonArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ─── Collect all public Vercel Blob URLs referenced in the DB ─────────────────

async function collectPublicUrls(): Promise<Set<string>> {
  const publicUrls = new Set<string>();

  // ── Product ──
  const products = await prisma.product.findMany({
    select: { id: true, sketchPaths: true, techPackPath: true },
  });
  for (const p of products) {
    for (const url of parseJsonArray(p.sketchPaths)) {
      if (isRawVercelBlobUrl(url)) publicUrls.add(url);
    }
    if (p.techPackPath && isRawVercelBlobUrl(p.techPackPath)) {
      publicUrls.add(p.techPackPath);
    }
  }

  // ── Sample ──
  const samples = await prisma.sample.findMany({
    select: {
      id: true,
      samplePhotoPaths: true,
      detailPhotoPaths: true,
      reviewPhotoPaths: true,
      packshotPaths: true,
    },
  });
  for (const s of samples) {
    for (const field of [
      s.samplePhotoPaths,
      s.detailPhotoPaths,
      s.reviewPhotoPaths,
      s.packshotPaths,
    ]) {
      for (const url of parseJsonArray(field)) {
        if (isRawVercelBlobUrl(url)) publicUrls.add(url);
      }
    }
  }

  // ── MediaPlacement ──
  const placements = await prisma.mediaPlacement.findMany({
    select: { id: true, screenshotPath: true },
  });
  for (const mp of placements) {
    if (mp.screenshotPath && isRawVercelBlobUrl(mp.screenshotPath)) {
      publicUrls.add(mp.screenshotPath);
    }
  }

  return publicUrls;
}

// ─── Copy each public blob to a private one ───────────────────────────────────

async function migrateBlobs(
  publicUrls: Set<string>
): Promise<Map<string, string>> {
  /** old public URL → new proxied path */
  const urlMap = new Map<string, string>();

  for (const oldUrl of publicUrls) {
    // Derive pathname from the blob URL (everything after the store hostname)
    const { pathname: blobPath } = new URL(oldUrl);
    // blobPath starts with "/" — strip it for the Vercel Blob pathname
    const pathname = blobPath.slice(1);

    // To avoid overwriting itself, copy to a "private-" prefixed path
    const newPathname = pathname.startsWith("private/")
      ? pathname
      : `private/${pathname}`;

    console.log(`  → Copying ${pathname}`);
    console.log(`         to ${newPathname} (private)`);

    if (!DRY_RUN) {
      const newBlob = await copy(oldUrl, newPathname, {
        access: "private",
        allowOverwrite: true,
      });
      urlMap.set(oldUrl, toProxiedPath(newBlob.url));
    } else {
      // In dry-run we produce a placeholder so the DB update logic can be previewed
      urlMap.set(oldUrl, toProxiedPath(`https://dry-run.vercel-storage.com/${newPathname}`));
    }
  }

  return urlMap;
}

// ─── Update all DB references ─────────────────────────────────────────────────

function replaceInArray(raw: string | null, urlMap: Map<string, string>): string | null {
  if (!raw) return raw;
  const arr = parseJsonArray(raw);
  const updated = arr.map((url) => urlMap.get(url) ?? url);
  // Only re-serialize if something changed
  if (updated.some((u, i) => u !== arr[i])) return JSON.stringify(updated);
  return raw;
}

async function updateDatabase(urlMap: Map<string, string>): Promise<void> {
  if (urlMap.size === 0) return;

  // ── Product ──
  const products = await prisma.product.findMany({
    select: { id: true, sketchPaths: true, techPackPath: true },
  });
  for (const p of products) {
    const newSketchPaths = replaceInArray(p.sketchPaths, urlMap);
    const newTechPackPath =
      p.techPackPath && urlMap.has(p.techPackPath)
        ? urlMap.get(p.techPackPath)!
        : p.techPackPath;

    const changed =
      newSketchPaths !== p.sketchPaths || newTechPackPath !== p.techPackPath;
    if (changed) {
      console.log(`  DB Product ${p.id}`);
      if (!DRY_RUN) {
        await prisma.product.update({
          where: { id: p.id },
          data: { sketchPaths: newSketchPaths, techPackPath: newTechPackPath },
        });
      }
    }
  }

  // ── Sample ──
  const samples = await prisma.sample.findMany({
    select: {
      id: true,
      samplePhotoPaths: true,
      detailPhotoPaths: true,
      reviewPhotoPaths: true,
      packshotPaths: true,
    },
  });
  for (const s of samples) {
    const newSamplePhotos = replaceInArray(s.samplePhotoPaths, urlMap);
    const newDetailPhotos = replaceInArray(s.detailPhotoPaths, urlMap);
    const newReviewPhotos = replaceInArray(s.reviewPhotoPaths, urlMap);
    const newPackshots = replaceInArray(s.packshotPaths, urlMap);

    const changed =
      newSamplePhotos !== s.samplePhotoPaths ||
      newDetailPhotos !== s.detailPhotoPaths ||
      newReviewPhotos !== s.reviewPhotoPaths ||
      newPackshots !== s.packshotPaths;

    if (changed) {
      console.log(`  DB Sample ${s.id}`);
      if (!DRY_RUN) {
        await prisma.sample.update({
          where: { id: s.id },
          data: {
            samplePhotoPaths: newSamplePhotos,
            detailPhotoPaths: newDetailPhotos,
            reviewPhotoPaths: newReviewPhotos,
            packshotPaths: newPackshots,
          },
        });
      }
    }
  }

  // ── MediaPlacement ──
  const placements = await prisma.mediaPlacement.findMany({
    select: { id: true, screenshotPath: true },
  });
  for (const mp of placements) {
    if (mp.screenshotPath && urlMap.has(mp.screenshotPath)) {
      const newPath = urlMap.get(mp.screenshotPath)!;
      console.log(`  DB MediaPlacement ${mp.id}`);
      if (!DRY_RUN) {
        await prisma.mediaPlacement.update({
          where: { id: mp.id },
          data: { screenshotPath: newPath },
        });
      }
    }
  }
}

// ─── Delete old public blobs ──────────────────────────────────────────────────

async function deleteOldBlobs(publicUrls: Set<string>): Promise<void> {
  const urls = [...publicUrls];
  console.log(`\nDeleting ${urls.length} old public blob(s)…`);
  if (!DRY_RUN) {
    // del() accepts an array
    await del(urls);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("❌  BLOB_READ_WRITE_TOKEN is not set.");
    process.exit(1);
  }

  if (DRY_RUN) {
    console.log("🔍  DRY RUN — no changes will be written.\n");
  }

  console.log("1/4  Scanning database for public Vercel Blob URLs…");
  const publicUrls = await collectPublicUrls();
  console.log(`     Found ${publicUrls.size} unique public URL(s).\n`);

  if (publicUrls.size === 0) {
    console.log("✅  Nothing to migrate.");
    return;
  }

  console.log("2/4  Copying blobs to private access…");
  const urlMap = await migrateBlobs(publicUrls);
  console.log(`     Done (${urlMap.size} blob(s) copied).\n`);

  console.log("3/4  Updating database references…");
  await updateDatabase(urlMap);
  console.log("     Done.\n");

  console.log("4/4  Deleting old public blobs…");
  await deleteOldBlobs(publicUrls);
  console.log("     Done.\n");

  console.log("✅  Migration complete.");
  if (DRY_RUN) {
    console.log("    Re-run without --dry-run to apply.");
  }
}

main()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
