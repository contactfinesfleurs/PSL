import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Package, Calendar, Tag, CheckCircle, Clock } from "lucide-react";

export default async function DashboardPage() {
  const [productCount, eventCount, campaignCount, validatedCount] =
    await Promise.all([
      prisma.product.count(),
      prisma.event.count(),
      prisma.campaign.count(),
      prisma.product.count({ where: { sampleStatus: "VALIDATED" } }),
    ]);

  const recentProducts = await prisma.product.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { samples: true },
  });

  const upcomingEvents = await prisma.event.findMany({
    take: 5,
    orderBy: { startAt: "asc" },
    where: { startAt: { gte: new Date() }, status: { not: "CANCELLED" } },
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="mt-1 text-sm text-gray-500">
          Vue d&apos;ensemble de vos produits et événements
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Produits"
          value={productCount}
          icon={<Package className="h-5 w-5 text-purple-600" />}
          href="/products"
          color="purple"
        />
        <StatCard
          label="Événements"
          value={eventCount}
          icon={<Calendar className="h-5 w-5 text-blue-600" />}
          href="/events"
          color="blue"
        />
        <StatCard
          label="Campagnes"
          value={campaignCount}
          icon={<Tag className="h-5 w-5 text-pink-600" />}
          href="/campaigns"
          color="pink"
        />
        <StatCard
          label="Validés"
          value={validatedCount}
          icon={<CheckCircle className="h-5 w-5 text-green-600" />}
          href="/products?status=VALIDATED"
          color="green"
        />
      </div>

      {/* Recent Products & Upcoming Events */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Products */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Produits récents</h2>
            <Link
              href="/products"
              className="text-sm text-purple-600 hover:underline"
            >
              Voir tout
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentProducts.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-400 text-center">
                Aucun produit encore.{" "}
                <Link href="/products/new" className="text-purple-600 hover:underline">
                  Créer le premier
                </Link>
              </p>
            ) : (
              recentProducts.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-500">{product.sku}</p>
                  </div>
                  <StatusBadge status={product.sampleStatus} />
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Événements à venir</h2>
            <Link
              href="/events"
              className="text-sm text-purple-600 hover:underline"
            >
              Voir tout
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {upcomingEvents.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-400 text-center">
                Aucun événement à venir.{" "}
                <Link href="/events/new" className="text-purple-600 hover:underline">
                  Créer un événement
                </Link>
              </p>
            ) : (
              upcomingEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {event.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      <Clock className="inline h-3 w-3 mr-1" />
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
}

function StatCard({
  label,
  value,
  icon,
  href,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  href: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    purple: "bg-purple-50",
    blue: "bg-blue-50",
    pink: "bg-pink-50",
    green: "bg-green-50",
  };
  return (
    <Link href={href}>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
        <div className={`inline-flex p-2 rounded-lg ${colorMap[color]}`}>
          {icon}
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500 mt-0.5">{label}</p>
        </div>
      </div>
    </Link>
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
      className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

function EventStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-600",
    CONFIRMED: "bg-blue-100 text-blue-700",
    COMPLETED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
  };
  const labels: Record<string, string> = {
    DRAFT: "Brouillon",
    CONFIRMED: "Confirmé",
    COMPLETED: "Terminé",
    CANCELLED: "Annulé",
  };
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {labels[status] ?? status}
    </span>
  );
}
