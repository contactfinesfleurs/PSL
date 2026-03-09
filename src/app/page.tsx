import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import {
  Package,
  Calendar,
  Tag,
  CheckCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  const profileId = session?.profileId ?? "";

  try {
    const [productCount, eventCount, campaignCount, validatedCount] =
      await Promise.all([
        prisma.product.count({ where: { profileId } }),
        prisma.event.count({ where: { profileId } }),
        prisma.campaign.count({ where: { profileId } }),
        prisma.product.count({ where: { profileId, sampleStatus: "VALIDATED" } }),
      ]);

    const recentProducts = await prisma.product.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      where: { profileId },
      include: { samples: true },
    });

    const upcomingEvents = await prisma.event.findMany({
      take: 5,
      orderBy: { startAt: "asc" },
      where: { profileId, startAt: { gte: new Date() }, status: { not: "CANCELLED" } },
    });

    return (
      <div className="space-y-10">
        {/* Header */}
        <div>
          <h1 className="text-5xl font-light text-gray-900 tracking-tight">
            Vue d&apos;ensemble
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Bienvenue sur PSL Studio
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          <StatCard
            label="Produits"
            value={productCount}
            icon={<Package className="h-5 w-5 text-gray-400" />}
            href="/products"
          />
          <StatCard
            label="Événements"
            value={eventCount}
            icon={<Calendar className="h-5 w-5 text-gray-400" />}
            href="/events"
          />
          <StatCard
            label="Campagnes"
            value={campaignCount}
            icon={<Tag className="h-5 w-5 text-gray-400" />}
            href="/campaigns"
          />
          <StatCard
            label="Validés"
            value={validatedCount}
            icon={<CheckCircle className="h-5 w-5 text-gray-400" />}
            href="/products?status=VALIDATED"
          />
        </div>

        {/* Recent Products & Upcoming Events */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent Products */}
          <div className="bg-white rounded-2xl border border-gray-200">
            <div className="flex items-center justify-between px-6 py-4">
              <h2 className="text-sm font-medium text-gray-900">
                Produits récents
              </h2>
              <Link
                href="/products"
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Voir tout
              </Link>
            </div>
            <div className="border-t border-gray-100 divide-y divide-gray-100">
              {recentProducts.length === 0 ? (
                <p className="px-6 py-8 text-sm text-gray-400 text-center">
                  Aucun produit encore.{" "}
                  <Link
                    href="/products/new"
                    className="text-indigo-600 hover:underline"
                  >
                    Créer le premier
                  </Link>
                </p>
              ) : (
                recentProducts.map((product) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.id}`}
                    className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 transition-colors"
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
          <div className="bg-white rounded-2xl border border-gray-200">
            <div className="flex items-center justify-between px-6 py-4">
              <h2 className="text-sm font-medium text-gray-900">
                Événements à venir
              </h2>
              <Link
                href="/events"
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Voir tout
              </Link>
            </div>
            <div className="border-t border-gray-100 divide-y divide-gray-100">
              {upcomingEvents.length === 0 ? (
                <p className="px-6 py-8 text-sm text-gray-400 text-center">
                  Aucun événement à venir.{" "}
                  <Link
                    href="/events/new"
                    className="text-indigo-600 hover:underline"
                  >
                    Créer un événement
                  </Link>
                </p>
              ) : (
                upcomingEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 transition-colors"
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
      <div className="space-y-8">
        <div>
          <h1 className="text-5xl font-light text-gray-900 tracking-tight">
            Vue d&apos;ensemble
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
                Les variables{" "}
                <code className="bg-amber-100 px-1 rounded font-mono text-xs">
                  DATABASE_URL
                </code>{" "}
                et{" "}
                <code className="bg-amber-100 px-1 rounded font-mono text-xs">
                  DATABASE_URL_UNPOOLED
                </code>{" "}
                ne sont pas configurées.
                <br />
                Allez dans{" "}
                <strong>Vercel → Project Settings → Environment Variables</strong>.
              </p>
            ) : (
              <p className="text-sm text-amber-700">
                La connexion à la base de données a échoué.
              </p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4 opacity-40 pointer-events-none select-none">
          {[
            { label: "Produits", icon: Package },
            { label: "Événements", icon: Calendar },
            { label: "Campagnes", icon: Tag },
            { label: "Validés", icon: CheckCircle },
          ].map(({ label, icon: Icon }) => (
            <div
              key={label}
              className="bg-white rounded-2xl border border-gray-200 p-6"
            >
              <Icon className="h-5 w-5 text-gray-400" />
              <div className="mt-4">
                <p className="text-4xl font-light text-gray-900">—</p>
                <p className="text-sm text-gray-500 mt-1">{label}</p>
              </div>
            </div>
          ))}
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
      <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:border-gray-300 transition-colors">
        {icon}
        <div className="mt-4">
          <p className="text-4xl font-light text-gray-900">{value}</p>
          <p className="text-sm text-gray-500 mt-1">{label}</p>
        </div>
      </div>
    </Link>
  );
}
