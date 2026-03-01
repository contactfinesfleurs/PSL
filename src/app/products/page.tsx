import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';
import { PRODUCT_FAMILIES, SEASONS, formatDate } from "@/lib/utils";
import { Plus, Package } from "lucide-react";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; family?: string; season?: string }>;
}) {
  const sp = await searchParams;
  const products = await prisma.product.findMany({
    where: {
      ...(sp.status ? { sampleStatus: sp.status as never } : {}),
      ...(sp.family ? { family: sp.family } : {}),
      ...(sp.season ? { season: sp.season } : {}),
    },
    include: { samples: true },
    orderBy: { createdAt: "desc" },
  });

  const familyLabel = (f: string) => PRODUCT_FAMILIES.find((x) => x.value === f)?.label ?? f;
  const seasonLabel = (s: string) => SEASONS.find((x) => x.value === s)?.label ?? s;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "36px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <h1>Produits</h1>
          <p style={{ marginTop: "6px", fontSize: "13px", color: "#8E8E93", fontWeight: 300 }}>
            {products.length} produit{products.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/products/new"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: "#1D1D1F",
            color: "#fff",
            fontSize: "12.5px",
            fontWeight: 400,
            padding: "8px 16px",
            borderRadius: "980px",
            letterSpacing: "-0.01em",
            transition: "opacity 0.15s",
          }}
        >
          <Plus strokeWidth={1.75} style={{ width: 13, height: 13 }} />
          Nouveau produit
        </Link>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {[
          { href: "/products", label: "Tous", active: !sp.family && !sp.status && !sp.season },
          { href: "/products?status=VALIDATED",     label: "Validés",    active: sp.status === "VALIDATED" },
          { href: "/products?status=NOT_VALIDATED", label: "Non validés", active: sp.status === "NOT_VALIDATED" },
          { href: "/products?status=PENDING",       label: "En attente", active: sp.status === "PENDING" },
        ].map(({ href, label, active }) => (
          <Link
            key={label}
            href={href}
            style={{
              padding: "5px 14px",
              borderRadius: "980px",
              fontSize: "12px",
              fontWeight: active ? 400 : 300,
              backgroundColor: active ? "#1D1D1F" : "rgba(0,0,0,0.05)",
              color: active ? "#fff" : "#3A3A3C",
              letterSpacing: "-0.01em",
              transition: "all 0.1s",
            }}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Grid */}
      {products.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px", backgroundColor: "#fff", borderRadius: "16px", border: "1px solid rgba(0,0,0,0.07)" }}>
          <Package strokeWidth={1} style={{ width: 40, height: 40, color: "#C7C7CC", margin: "0 auto 16px" }} />
          <p style={{ color: "#8E8E93", fontSize: "13px", fontWeight: 300 }}>Aucun produit trouvé</p>
          <Link
            href="/products/new"
            style={{ display: "inline-flex", alignItems: "center", gap: "5px", marginTop: "14px", fontSize: "12.5px", color: "#1D1D1F", fontWeight: 400 }}
          >
            <Plus strokeWidth={1.5} style={{ width: 12, height: 12 }} />
            Créer le premier produit
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="apple-card card-hover row-hover"
              style={{ display: "block", padding: "18px", transition: "box-shadow 0.15s" }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: "13px", fontWeight: 400, color: "#1D1D1F", letterSpacing: "-0.015em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {product.name}
                  </p>
                  <p style={{ fontSize: "10.5px", color: "#8E8E93", fontWeight: 300, marginTop: "2px", fontFamily: "ui-monospace, monospace" }}>
                    {product.sku}
                  </p>
                </div>
                <StatusPill status={product.sampleStatus} />
              </div>

              <div style={{ marginTop: "14px", display: "flex", flexWrap: "wrap", gap: "5px" }}>
                <Chip>{familyLabel(product.family)}</Chip>
                <Chip>{seasonLabel(product.season)} {product.year}</Chip>
                <Chip>{product.sizeRange}</Chip>
              </div>

              {product.plannedLaunchAt && (
                <p style={{ marginTop: "12px", fontSize: "11px", color: "#8E8E93", fontWeight: 300 }}>
                  Lancement : {formatDate(product.plannedLaunchAt)}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ display: "inline-block", backgroundColor: "rgba(0,0,0,0.05)", color: "#636366", fontSize: "10.5px", fontWeight: 300, padding: "2px 8px", borderRadius: "6px", letterSpacing: "-0.01em" }}>
      {children}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    PENDING:       { label: "En attente", color: "#92400E", bg: "rgba(245,158,11,0.12)" },
    VALIDATED:     { label: "Validé",     color: "#166534", bg: "rgba(34,197,94,0.12)"  },
    NOT_VALIDATED: { label: "Non validé", color: "#991B1B", bg: "rgba(239,68,68,0.12)"  },
  };
  const s = map[status] ?? { label: status, color: "#636366", bg: "rgba(0,0,0,0.06)" };
  return (
    <span style={{ flexShrink: 0, fontSize: "10.5px", fontWeight: 300, padding: "2px 9px", borderRadius: "20px", backgroundColor: s.bg, color: s.color, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}
