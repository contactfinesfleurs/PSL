import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PRODUCT_FAMILIES, SEASONS, formatDate } from "@/lib/utils";
import { Plus, Package } from "lucide-react";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { status?: string; family?: string; season?: string };
}) {
  const products = await prisma.product.findMany({
    where: {
      ...(searchParams.status
        ? { sampleStatus: searchParams.status as never }
        : {}),
      ...(searchParams.family ? { family: searchParams.family } : {}),
      ...(searchParams.season ? { season: searchParams.season } : {}),
    },
    include: { samples: true },
    orderBy: { createdAt: "desc" },
  });

  const familyLabel = (f: string) =>
    PRODUCT_FAMILIES.find((x) => x.value === f)?.label ?? f;

  const seasonLabel = (s: string) =>
    SEASONS.find((x) => x.value === s)?.label ?? s;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Produits</h1>
          <p className="text-sm text-gray-500 mt-1">
            {products.length} produit{products.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/products/new"
          className="inline-flex items-center gap-2 bg-purple-700 hover:bg-purple-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nouveau produit
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <FilterLink
          href="/products"
          active={!searchParams.family && !searchParams.status && !searchParams.season}
          label="Tous"
        />
        {["VALIDATED", "NOT_VALIDATED", "PENDING"].map((s) => (
          <FilterLink
            key={s}
            href={`/products?status=${s}`}
            active={searchParams.status === s}
            label={
              s === "VALIDATED"
                ? "Validés"
                : s === "NOT_VALIDATED"
                  ? "Non validés"
                  : "En attente"
            }
          />
        ))}
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-xl border border-gray-200">
          <Package className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">Aucun produit trouvé</p>
          <Link
            href="/products/new"
            className="mt-4 inline-flex items-center gap-1 text-sm text-purple-600 hover:underline"
          >
            <Plus className="h-3 w-3" />
            Créer le premier produit
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    {product.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 font-mono">
                    {product.sku}
                  </p>
                </div>
                <StatusBadge status={product.sampleStatus} />
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <Chip>{familyLabel(product.family)}</Chip>
                <Chip>
                  {seasonLabel(product.season)} {product.year}
                </Chip>
                <Chip>{product.sizeRange}</Chip>
              </div>

              {product.plannedLaunchAt && (
                <p className="mt-3 text-xs text-gray-500">
                  Lancement prévu : {formatDate(product.plannedLaunchAt)}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterLink({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
        active
          ? "bg-purple-100 text-purple-700"
          : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
      }`}
    >
      {label}
    </Link>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">
      {children}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-700",
    VALIDATED: "bg-green-100 text-green-700",
    NOT_VALIDATED: "bg-red-100 text-red-700",
  };
  const labels: Record<string, string> = {
    PENDING: "En attente",
    VALIDATED: "Validé",
    NOT_VALIDATED: "Non validé",
  };
  return (
    <span
      className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {labels[status] ?? status}
    </span>
  );
}
