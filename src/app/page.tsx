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
            <StatCard key={label} label={label} value={value} Icon={Icon} href={href} />
          ))}
        </div>

        {/* Tables */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          <Panel title="Produits récents" href="/products" hrefLabel="Voir tout">
            {recentProducts.length === 0 ? (
              <Empty label="Aucun produit." cta="Créer le premier" href="/products/new" />
            ) : recentProducts.map((p, i) => (
              <Row key={p.id} href={`/products/${p.id}`} index={i}>
                <div>
                  <div style={{ fontSize: "12.5px", fontWeight: 300, color: "#1D1D1F", letterSpacing: "-0.01em" }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: "10.5px", color: "#8E8E93", fontWeight: 300, marginTop: "1px", fontFamily: "ui-monospace, monospace" }}>
                    {p.sku}
                  </div>
                </div>
                <StatusPill status={p.sampleStatus} type="product" />
              </Row>
            ))}
          </Panel>

          <Panel title="Événements à venir" href="/events" hrefLabel="Voir tout">
            {upcomingEvents.length === 0 ? (
              <Empty label="Aucun événement." cta="Créer un événement" href="/events/new" />
            ) : upcomingEvents.map((ev, i) => (
              <Row key={ev.id} href={`/events/${ev.id}`} index={i}>
                <div>
                  <div style={{ fontSize: "12.5px", fontWeight: 300, color: "#1D1D1F", letterSpacing: "-0.01em" }}>
                    {ev.name}
                  </div>
                  <div style={{ fontSize: "10.5px", color: "#8E8E93", fontWeight: 300, marginTop: "1px", display: "flex", alignItems: "center", gap: "3px" }}>
                    <Clock strokeWidth={1.5} style={{ width: 10, height: 10 }} />
                    {formatDate(ev.startAt)}{ev.location ? ` · ${ev.location}` : ""}
                  </div>
                </div>
                <StatusPill status={ev.status} type="event" />
              </Row>
            ))}
          </Panel>
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

/* ─── Sub-components ────────────────────────────────── */

function StatCard({ label, value, Icon, href }: { label: string; value: number; Icon: React.ElementType; href: string }) {
  return (
    <Link href={href}>
      <div
        className="apple-card"
        style={{ padding: "20px 18px", cursor: "pointer", transition: "box-shadow 0.15s" }}
        onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.07)")}
        onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
      >
        <Icon strokeWidth={1.25} style={{ width: 14, height: 14, color: "#8E8E93", marginBottom: "18px" }} />
        <div style={{ fontSize: "36px", fontWeight: 200, color: "#1D1D1F", letterSpacing: "-0.04em", lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontSize: "11px", color: "#8E8E93", fontWeight: 300, marginTop: "5px", letterSpacing: "0.005em" }}>
          {label}
        </div>
      </div>
    </Link>
  );
}

function Panel({ title, href, hrefLabel, children }: { title: string; href: string; hrefLabel: string; children: React.ReactNode }) {
  return (
    <div className="apple-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
        <span style={{ fontSize: "12px", fontWeight: 400, color: "#1D1D1F", letterSpacing: "-0.015em" }}>
          {title}
        </span>
        <Link
          href={href}
          style={{ fontSize: "11px", color: "#0071E3", fontWeight: 300 }}
        >
          {hrefLabel}
        </Link>
      </div>
      <div>{children}</div>
    </div>
  );
}

function Row({ href, index, children }: { href: string; index: number; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 18px",
        borderTop: index > 0 ? "1px solid rgba(0,0,0,0.04)" : "none",
        transition: "background 0.1s",
      }}
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.02)")}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
    >
      {children}
    </Link>
  );
}

function Empty({ label, cta, href }: { label: string; cta: string; href: string }) {
  return (
    <div style={{ padding: "32px 18px", textAlign: "center", color: "#8E8E93", fontSize: "12px", fontWeight: 300 }}>
      {label}{" "}
      <Link href={href} style={{ color: "#0071E3", fontWeight: 300 }}>{cta}</Link>
    </div>
  );
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
    <span style={{ fontSize: "10.5px", fontWeight: 300, padding: "2px 9px", borderRadius: "20px", backgroundColor: s.bg, color: s.color, whiteSpace: "nowrap", letterSpacing: "0.005em" }}>
      {s.label}
    </span>
  );
}
