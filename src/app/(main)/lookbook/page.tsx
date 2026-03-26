import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PRODUCT_FAMILIES, SEASONS, safeParseArray } from "@/lib/utils";
import Image from "next/image";
import { ArrowLeft, Package } from "lucide-react";

export const dynamic = "force-dynamic";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const familyLabel = (v: string) =>
  PRODUCT_FAMILIES.find((f) => f.value === v)?.label ?? v;

const seasonLabel = (v: string) =>
  SEASONS.find((s) => s.value === v)?.label ?? v;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function LookBookPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string; year?: string; family?: string }>;
}) {
  const sp = await searchParams;

  // Available seasons+years in the DB
  const allProducts = await prisma.product.findMany({
    select: { season: true, year: true },
    distinct: ["season", "year"],
    orderBy: [{ year: "desc" }, { season: "asc" }],
    where: { deletedAt: null },
  });

  const collections = Array.from(
    new Map(
      allProducts.map((p) => [`${p.season}-${p.year}`, p])
    ).values()
  );

  // Active filters
  const activeSeason = sp.season ?? collections[0]?.season ?? "";
  const activeYear = sp.year ? parseInt(sp.year) : collections[0]?.year ?? new Date().getFullYear();
  const activeFamily = sp.family ?? "";

  // Fetch products for current collection with their samples (for packshots)
  const products = await prisma.product.findMany({
    where: {
      deletedAt: null,
      season: activeSeason || undefined,
      year: activeYear || undefined,
      ...(activeFamily ? { family: activeFamily } : {}),
    },
    include: {
      samples: {
        select: { packshotPaths: true, samplePhotoPaths: true },
        take: 1,
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Stats
  const validated = products.filter((p) => p.sampleStatus === "VALIDATED").length;
  const pending = products.filter((p) => p.sampleStatus === "PENDING").length;
  const notValidated = products.filter((p) => p.sampleStatus === "NOT_VALIDATED").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Look Book</h1>
          <p className="text-sm text-gray-500 mt-1">
            Vue collection — {products.length} pièce{products.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Collection selector */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {collections.map((c) => {
            const isActive = c.season === activeSeason && c.year === activeYear;
            const params = new URLSearchParams({
              season: c.season,
              year: String(c.year),
              ...(activeFamily ? { family: activeFamily } : {}),
            });
            return (
              <Link
                key={`${c.season}-${c.year}`}
                href={`/lookbook?${params}`}
                className={`text-sm font-medium px-3 py-1.5 rounded-xl border transition-colors ${
                  isActive
                    ? "bg-gray-900 text-white border-gray-900"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {seasonLabel(c.season)} {c.year}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Filters + Stats */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Family filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/lookbook?season=${activeSeason}&year=${activeYear}`}
            className={`text-xs font-medium px-3 py-1 rounded-full border transition-colors ${
              !activeFamily
                ? "bg-gray-900 text-white border-gray-900"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            Tout
          </Link>
          {PRODUCT_FAMILIES.map((f) => {
            const isActive = activeFamily === f.value;
            return (
              <Link
                key={f.value}
                href={`/lookbook?season=${activeSeason}&year=${activeYear}&family=${f.value}`}
                className={`text-xs font-medium px-3 py-1 rounded-full border transition-colors ${
                  isActive
                    ? "bg-gray-900 text-white border-gray-900"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </div>

        {/* Completion stats */}
        <div className="flex items-center gap-4 text-xs text-gray-500 shrink-0">
          <span className="text-green-700 font-medium">{validated} validé{validated !== 1 ? "s" : ""}</span>
          <span className="text-yellow-700 font-medium">{pending} en attente</span>
          {notValidated > 0 && (
            <span className="text-red-700 font-medium">{notValidated} non validé{notValidated !== 1 ? "s" : ""}</span>
          )}
          <div className="flex items-center gap-1">
            <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: products.length > 0 ? `${(validated / products.length) * 100}%` : "0%" }}
              />
            </div>
            <span>{products.length > 0 ? Math.round((validated / products.length) * 100) : 0}%</span>
          </div>
        </div>
      </div>

      {/* Grid */}
      {products.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-2xl border border-gray-200/80">
          <Package className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">Aucun produit dans cette collection</p>
          <Link
            href="/products/new"
            className="mt-3 inline-block text-sm text-purple-600 hover:underline"
          >
            Créer un produit
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {products.map((product) => {
            const sample = product.samples[0];
            const packshots = safeParseArray(sample?.packshotPaths ?? null);
            const samplePhotos = safeParseArray(sample?.samplePhotoPaths ?? null);
            const coverPhoto = packshots[0] ?? samplePhotos[0] ?? null;

            const statusColor =
              product.sampleStatus === "VALIDATED"
                ? "bg-green-500"
                : product.sampleStatus === "NOT_VALIDATED"
                ? "bg-red-500"
                : "bg-yellow-400";

            return (
              <Link
                key={product.id}
                href={`/products/${product.id}?tab=sample`}
                className="group bg-white border border-gray-200/80 rounded-2xl overflow-hidden hover:shadow-md transition-all duration-200"
              >
                {/* Photo */}
                <div className="relative aspect-[3/4] bg-gray-100">
                  {coverPhoto ? (
                    <Image
                      src={coverPhoto}
                      alt={product.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Package className="h-10 w-10 text-gray-300" />
                    </div>
                  )}

                  {/* Status dot */}
                  <span
                    className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full ${statusColor} ring-2 ring-white`}
                    title={product.sampleStatus}
                  />

                  {/* Packshot count badge */}
                  {packshots.length > 1 && (
                    <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                      {packshots.length}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
                    {product.name}
                  </p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{product.sku}</p>
                  <p className="text-xs text-gray-500 mt-1">{familyLabel(product.family)}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
