import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';
import { formatDate } from "@/lib/utils";
import { Package, Calendar, Tag, CheckCircle, Clock, AlertTriangle } from "lucide-react";

export default async function DashboardPage() {
  try {
    const [productCount, eventCount, campaignCount, validatedCount] =
      await Promise.all([
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
      <div className="space-y-10">
        {/* Header */}
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 200, color: '#1D1D1F', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            Tableau de bord
          </h1>
          <p style={{ marginTop: '6px', fontSize: '13px', color: '#86868B', fontWeight: 300 }}>
            Vue d&apos;ensemble de vos produits et événements
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Produits" value={productCount} icon={<Package className="h-4 w-4" style={{ color: '#6E6E73' }} strokeWidth={1.5} />} href="/products" />
          <StatCard label="Événements" value={eventCount} icon={<Calendar className="h-4 w-4" style={{ color: '#6E6E73' }} strokeWidth={1.5} />} href="/events" />
          <StatCard label="Campagnes" value={campaignCount} icon={<Tag className="h-4 w-4" style={{ color: '#6E6E73' }} strokeWidth={1.5} />} href="/campaigns" />
          <StatCard label="Validés" value={validatedCount} icon={<CheckCircle className="h-4 w-4" style={{ color: '#6E6E73' }} strokeWidth={1.5} />} href="/products?status=VALIDATED" />
        </div>

        {/* Recent Products & Upcoming Events */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Recent Products */}
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '13px', fontWeight: 400, color: '#1D1D1F', letterSpacing: '-0.01em' }}>Produits récents</span>
              <Link href="/products" style={{ fontSize: '12px', color: '#6E6E73', fontWeight: 300 }} className="hover:text-[#1D1D1F] transition-colors">
                Voir tout
              </Link>
            </div>
            <div>
              {recentProducts.length === 0 ? (
                <p className="px-5 py-8 text-center" style={{ fontSize: '13px', color: '#86868B', fontWeight: 300 }}>
                  Aucun produit.{" "}
                  <Link href="/products/new" style={{ color: '#1D1D1F' }}>Créer le premier</Link>
                </p>
              ) : (
                recentProducts.map((product, i) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.id}`}
                    className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-black/[0.02]"
                    style={{ borderTop: i > 0 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}
                  >
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 300, color: '#1D1D1F', letterSpacing: '-0.01em' }}>
                        {product.name}
                      </p>
                      <p style={{ fontSize: '11px', color: '#86868B', fontWeight: 300, marginTop: '1px', fontFamily: 'monospace' }}>
                        {product.sku}
                      </p>
                    </div>
                    <StatusBadge status={product.sampleStatus} />
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '13px', fontWeight: 400, color: '#1D1D1F', letterSpacing: '-0.01em' }}>Événements à venir</span>
              <Link href="/events" style={{ fontSize: '12px', color: '#6E6E73', fontWeight: 300 }} className="hover:text-[#1D1D1F] transition-colors">
                Voir tout
              </Link>
            </div>
            <div>
              {upcomingEvents.length === 0 ? (
                <p className="px-5 py-8 text-center" style={{ fontSize: '13px', color: '#86868B', fontWeight: 300 }}>
                  Aucun événement à venir.{" "}
                  <Link href="/events/new" style={{ color: '#1D1D1F' }}>Créer un événement</Link>
                </p>
              ) : (
                upcomingEvents.map((event, i) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-black/[0.02]"
                    style={{ borderTop: i > 0 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}
                  >
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 300, color: '#1D1D1F', letterSpacing: '-0.01em' }}>
                        {event.name}
                      </p>
                      <p style={{ fontSize: '11px', color: '#86868B', fontWeight: 300, marginTop: '1px' }}>
                        <Clock className="inline h-3 w-3 mr-1" strokeWidth={1.5} />
                        {formatDate(event.startAt)}
                        {event.location ? ` · ${event.location}` : ""}
                      </p>
                    </div>
                    <EventStatusBadge status={event.status} />
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Dashboard DB error:", error);
    const missingEnv =
      !process.env.DATABASE_URL || !process.env.DATABASE_URL_UNPOOLED;
    return (
      <div className="space-y-8">
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 200, color: '#1D1D1F', letterSpacing: '-0.03em' }}>
            Tableau de bord
          </h1>
        </div>
        <div className="rounded-2xl p-6 flex gap-4" style={{ backgroundColor: '#FFFBEB', border: '1px solid rgba(0,0,0,0.08)' }}>
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: '#92400E' }} strokeWidth={1.5} />
          <div>
            <p style={{ fontSize: '13px', fontWeight: 400, color: '#92400E', marginBottom: '4px' }}>
              Connexion à la base de données impossible
            </p>
            <p style={{ fontSize: '12px', color: '#B45309', fontWeight: 300 }}>
              {missingEnv
                ? "Configurez DATABASE_URL et DATABASE_URL_UNPOOLED dans Vercel."
                : "Vérifiez vos variables d'environnement et que votre base Neon est accessible."}
            </p>
          </div>
        </div>
      </div>
    );
  }
}

function StatCard({
  label,
  value,
  icon,
  href,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  href: string;
}) {
  return (
    <Link href={href}>
      <div
        className="rounded-2xl p-5 transition-all hover:bg-white/90"
        style={{ backgroundColor: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)' }}
      >
        <div className="flex items-center justify-between mb-4">
          {icon}
        </div>
        <p style={{ fontSize: '28px', fontWeight: 200, color: '#1D1D1F', letterSpacing: '-0.03em', lineHeight: 1 }}>
          {value}
        </p>
        <p style={{ fontSize: '12px', color: '#86868B', fontWeight: 300, marginTop: '4px', letterSpacing: '-0.01em' }}>
          {label}
        </p>
      </div>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    PENDING:       { bg: 'rgba(251,191,36,0.12)', color: '#92400E' },
    VALIDATED:     { bg: 'rgba(34,197,94,0.12)',  color: '#166534' },
    NOT_VALIDATED: { bg: 'rgba(239,68,68,0.12)',  color: '#991B1B' },
  };
  const labels: Record<string, string> = {
    PENDING: "En attente",
    VALIDATED: "Validé",
    NOT_VALIDATED: "Non validé",
  };
  const s = styles[status] ?? { bg: 'rgba(0,0,0,0.06)', color: '#6E6E73' };
  return (
    <span
      style={{
        fontSize: '11px',
        fontWeight: 300,
        padding: '2px 8px',
        borderRadius: '20px',
        backgroundColor: s.bg,
        color: s.color,
        letterSpacing: '-0.01em',
        whiteSpace: 'nowrap',
      }}
    >
      {labels[status] ?? status}
    </span>
  );
}

function EventStatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    DRAFT:     { bg: 'rgba(0,0,0,0.06)',          color: '#6E6E73' },
    CONFIRMED: { bg: 'rgba(59,130,246,0.12)',      color: '#1E40AF' },
    COMPLETED: { bg: 'rgba(34,197,94,0.12)',       color: '#166534' },
    CANCELLED: { bg: 'rgba(239,68,68,0.12)',       color: '#991B1B' },
  };
  const labels: Record<string, string> = {
    DRAFT: "Brouillon",
    CONFIRMED: "Confirmé",
    COMPLETED: "Terminé",
    CANCELLED: "Annulé",
  };
  const s = styles[status] ?? { bg: 'rgba(0,0,0,0.06)', color: '#6E6E73' };
  return (
    <span
      style={{
        fontSize: '11px',
        fontWeight: 300,
        padding: '2px 8px',
        borderRadius: '20px',
        backgroundColor: s.bg,
        color: s.color,
        letterSpacing: '-0.01em',
        whiteSpace: 'nowrap',
      }}
    >
      {labels[status] ?? status}
    </span>
  );
}
