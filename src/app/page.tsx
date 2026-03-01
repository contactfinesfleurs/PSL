import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Package, Calendar, Tag, CheckCircle, Clock, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  try {
    const [productCount, eventCount, campaignCount, validatedCount] = await Promise.all([
      prisma.product.count(),
      prisma.event.count(),
      prisma.campaign.count(),
      prisma.product.count({ where: { sampleStatus: "VALIDATED" } }),
    ]);

    const recentProducts = await prisma.product.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { samples: true },
    });

    const upcomingEvents = await prisma.event.findMany({
      take: 6,
      orderBy: { startAt: "asc" },
      where: { startAt: { gte: new Date() }, status: { not: "CANCELLED" } },
    });

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "52px" }}>

        {/* Header */}
        <div>
          <h1>Vue d&apos;ensemble</h1>
          <p style={{ marginTop: "6px", fontSize: "13px", color: "#8E8E93", fontWeight: 300 }}>
            Bienvenue sur PSL Studio
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
          {[
            { label: "Produits",   value: productCount,   Icon: Package,     href: "/products" },
            { label: "Événements", value: eventCount,     Icon: Calendar,    href: "/events" },
            { label: "Campagnes",  value: campaignCount,  Icon: Tag,         href: "/campaigns" },
            { label: "Validés",    value: validatedCount, Icon: CheckCircle, href: "/products?status=VALIDATED" },
          ].map(({ label, value, Icon, href }) => (
            <Link key={label} href={href} className="apple-card card-hover" style={{ display: "block", padding: "20px 18px", transition: "box-shadow 0.15s" }}>
              <Icon strokeWidth={1.25} style={{ width: 14, height: 14, color: "#8E8E93", marginBottom: "18px" }} />
              <div style={{ fontSize: "36px", fontWeight: 200, color: "#1D1D1F", letterSpacing: "-0.04em", lineHeight: 1 }}>
                {value}
              </div>
              <div style={{ fontSize: "11px", color: "#8E8E93", fontWeight: 300, marginTop: "5px" }}>
                {label}
              </div>
            </Link>
          ))}
        </div>

        {/* Tables */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>

          {/* Recent Products */}
          <div className="apple-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
              <span style={{ fontSize: "12px", fontWeight: 400, color: "#1D1D1F", letterSpacing: "-0.015em" }}>Produits récents</span>
              <Link href="/products" className="link-hover" style={{ fontSize: "11px" }}>Voir tout</Link>
            </div>
            <div>
              {recentProducts.length === 0 ? (
                <div style={{ padding: "32px 18px", textAlign: "center", color: "#8E8E93", fontSize: "12px", fontWeight: 300 }}>
                  Aucun produit.{" "}
                  <Link href="/products/new" style={{ color: "#0071E3" }}>Créer le premier</Link>
                </div>
              ) : recentProducts.map((p, i) => (
                <Link key={p.id} href={`/products/${p.id}`} className="row-hover" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 18px", borderTop: i > 0 ? "1px solid rgba(0,0,0,0.04)" : "none" }}>
                  <div>
                    <div style={{ fontSize: "12.5px", fontWeight: 300, color: "#1D1D1F", letterSpacing: "-0.01em" }}>{p.name}</div>
                    <div style={{ fontSize: "10.5px", color: "#8E8E93", fontWeight: 300, marginTop: "1px", fontFamily: "ui-monospace, monospace" }}>{p.sku}</div>
                  </div>
                  <StatusPill status={p.sampleStatus} type="product" />
                </Link>
              ))}
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="apple-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
              <span style={{ fontSize: "12px", fontWeight: 400, color: "#1D1D1F", letterSpacing: "-0.015em" }}>Événements à venir</span>
              <Link href="/events" className="link-hover" style={{ fontSize: "11px" }}>Voir tout</Link>
            </div>
            <div>
              {upcomingEvents.length === 0 ? (
                <div style={{ padding: "32px 18px", textAlign: "center", color: "#8E8E93", fontSize: "12px", fontWeight: 300 }}>
                  Aucun événement.{" "}
                  <Link href="/events/new" style={{ color: "#0071E3" }}>Créer un événement</Link>
                </div>
              ) : upcomingEvents.map((ev, i) => (
                <Link key={ev.id} href={`/events/${ev.id}`} className="row-hover" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 18px", borderTop: i > 0 ? "1px solid rgba(0,0,0,0.04)" : "none" }}>
                  <div>
                    <div style={{ fontSize: "12.5px", fontWeight: 300, color: "#1D1D1F", letterSpacing: "-0.01em" }}>{ev.name}</div>
                    <div style={{ fontSize: "10.5px", color: "#8E8E93", fontWeight: 300, marginTop: "1px", display: "flex", alignItems: "center", gap: "3px" }}>
                      <Clock strokeWidth={1.5} style={{ width: 10, height: 10 }} />
                      {formatDate(ev.startAt)}{ev.location ? ` · ${ev.location}` : ""}
                    </div>
                  </div>
                  <StatusPill status={ev.status} type="event" />
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    );
  } catch (error) {
    console.error("Dashboard DB error:", error);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
        <h1>Vue d&apos;ensemble</h1>
        <div style={{ backgroundColor: "#FFFBEB", border: "1px solid rgba(234,179,8,0.2)", borderRadius: "14px", padding: "18px 20px", display: "flex", gap: "12px" }}>
          <AlertTriangle strokeWidth={1.5} style={{ width: 14, height: 14, color: "#92400E", flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontSize: "12.5px", fontWeight: 400, color: "#92400E" }}>Connexion à la base de données impossible</div>
            <div style={{ fontSize: "12px", color: "#B45309", fontWeight: 300, marginTop: "3px" }}>
              Vérifiez les variables d&apos;environnement DATABASE_URL dans Vercel.
            </div>
          </div>
        </div>
      </div>
    );
  }
}

const productPills: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:       { label: "En attente", color: "#92400E", bg: "rgba(245,158,11,0.12)" },
  VALIDATED:     { label: "Validé",     color: "#166534", bg: "rgba(34,197,94,0.12)"  },
  NOT_VALIDATED: { label: "Non validé", color: "#991B1B", bg: "rgba(239,68,68,0.12)"  },
};
const eventPills: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT:     { label: "Brouillon", color: "#6E6E73", bg: "rgba(0,0,0,0.06)"       },
  CONFIRMED: { label: "Confirmé",  color: "#1E40AF", bg: "rgba(59,130,246,0.12)"  },
  COMPLETED: { label: "Terminé",   color: "#166534", bg: "rgba(34,197,94,0.12)"   },
  CANCELLED: { label: "Annulé",    color: "#991B1B", bg: "rgba(239,68,68,0.12)"   },
};

function StatusPill({ status, type }: { status: string; type: "product" | "event" }) {
  const map = type === "product" ? productPills : eventPills;
  const s = map[status] ?? { label: status, color: "#6E6E73", bg: "rgba(0,0,0,0.06)" };
  return (
    <span style={{ fontSize: "10.5px", fontWeight: 300, padding: "2px 9px", borderRadius: "20px", backgroundColor: s.bg, color: s.color, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}
