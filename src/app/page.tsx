import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Package, Calendar, Tag, CheckCircle, Clock, AlertTriangle, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

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
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
            Tableau de bord
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Vue d&apos;ensemble de vos produits et événements
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Produits"
            value={productCount}
            icon={<Package className="h-5 w-5" />}
            href="/products"
            color="purple"
          />
          <StatCard
            label="Événements"
            value={eventCount}
            icon={<Calendar className="h-5 w-5" />}
            href="/events"
            color="blue"
          />
          <StatCard
            label="Campagnes"
            value={campaignCount}
            icon={<Tag className="h-5 w-5" />}
            href="/campaigns"
            color="pink"
          />
          <StatCard
            label="Validés"
            value={validatedCount}
            icon={<CheckCircle className="h-5 w-5" />}
            href="/products?status=VALIDATED"
            color="green"
          />
        </div>

        {/* Recent Products & Upcoming Events */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent Products */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">
                Produits récents
              </h2>
              <Link
                href="/products"
                className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 font-medium transition-colors"
              >
                Voir tout
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {recentProducts.length === 0 ? (
                <p className="px-6 py-8 text-sm text-gray-400 text-center">
                  Aucun produit encore.{" "}
                  <Link
                    href="/products/new"
                    className="text-purple-600 hover:underline"
                  >
                    Créer le premier
                  </Link>
                </p>
              ) : (
                recentProducts.map((product) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.id}`}
                    className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50/80 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {product.name}
                      </p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">
                        {product.sku}
                      </p>
                    </div>
                    <Badge status={product.sampleStatus} />
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">
                Événements à venir
              </h2>
              <Link
                href="/events"
                className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 font-medium transition-colors"
              >
                Voir tout
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {upcomingEvents.length === 0 ? (
                <p className="px-6 py-8 text-sm text-gray-400 text-center">
                  Aucun événement à venir.{" "}
                  <Link
                    href="/events/new"
                    className="text-purple-600 hover:underline"
                  >
                    Créer un événement
                  </Link>
                </p>
              ) : (
                upcomingEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50/80 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {event.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        <Clock className="inline h-3 w-3" />
                        {formatDate(event.startAt)}
                        {event.location ? ` · ${event.location}` : ""}
                      </p>
                    </div>
                    <Badge status={event.status} />
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
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
            Tableau de bord
          </h1>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex gap-4">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="font-semibold text-amber-800 mb-1 text-sm">
              Connexion à la base de données impossible
            </h2>
            {missingEnv ? (
              <p className="text-sm text-amber-700">
                Les variables d&apos;environnement{" "}
                <code className="bg-amber-100 px-1 rounded font-mono text-xs">
                  DATABASE_URL
                </code>{" "}
                et{" "}
                <code className="bg-amber-100 px-1 rounded font-mono text-xs">
                  DATABASE_URL_UNPOOLED
                </code>{" "}
                ne sont pas configurées dans Vercel.
                <br />
                Allez dans{" "}
                <strong>Vercel → Project Settings → Environment Variables</strong>{" "}
                et ajoutez vos identifiants Neon PostgreSQL.
              </p>
            ) : (
              <p className="text-sm text-amber-700">
                La connexion à la base de données a échoué. Vérifiez vos
                variables d&apos;environnement dans Vercel et que votre base
                Neon est accessible.
              </p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 opacity-40 pointer-events-none select-none">
          {[
            { label: "Produits", icon: Package, color: "purple" },
            { label: "Événements", icon: Calendar, color: "blue" },
            { label: "Campagnes", icon: Tag, color: "pink" },
            { label: "Validés", icon: CheckCircle, color: "green" },
          ].map(({ label, icon: Icon, color }) => (
            <div
              key={label}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5"
            >
              <div
                className={`inline-flex p-2.5 rounded-xl ${
                  color === "purple"
                    ? "bg-purple-50"
                    : color === "blue"
                      ? "bg-blue-50"
                      : color === "pink"
                        ? "bg-pink-50"
                        : "bg-green-50"
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${
                    color === "purple"
                      ? "text-purple-600"
                      : color === "blue"
                        ? "text-blue-600"
                        : color === "pink"
                          ? "text-pink-600"
                          : "text-green-600"
                  }`}
                />
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-gray-900">—</p>
                <p className="text-sm text-gray-500 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
}

const colorConfig: Record<
  string,
  { bg: string; icon: string; border: string }
> = {
  purple: {
    bg: "bg-purple-50",
    icon: "text-purple-600",
    border: "border-purple-100",
  },
  blue: { bg: "bg-blue-50", icon: "text-blue-600", border: "border-blue-100" },
  pink: { bg: "bg-pink-50", icon: "text-pink-600", border: "border-pink-100" },
  green: {
    bg: "bg-green-50",
    icon: "text-green-600",
    border: "border-green-100",
  },
};

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
  const c = colorConfig[color] ?? colorConfig.purple;
  return (
    <Link href={href}>
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
        <div className={`inline-flex p-2.5 rounded-xl ${c.bg}`}>
          <span className={c.icon}>{icon}</span>
        </div>
        <div className="mt-4">
          <p className="text-3xl font-bold text-gray-900 tracking-tight">
            {value}
          </p>
          <p className="text-sm text-gray-500 mt-0.5">{label}</p>
        </div>
      </div>
    </Link>
  );
}
