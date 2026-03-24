import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { CAMPAIGN_TYPES, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Plus, Megaphone, Lock } from "lucide-react";
import { getResourceUsage } from "@/lib/plan-guard";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const session = await getSession();
  const profileId = session?.profileId ?? "";

  const [campaigns, usage] = await Promise.all([
    prisma.campaign.findMany({
      where: { profileId, deletedAt: null },
      include: { products: true, event: true },
      orderBy: { createdAt: "desc" },
    }),
    getResourceUsage(profileId, "campaigns"),
  ]);

  const typeLabel = (t: string) =>
    CAMPAIGN_TYPES.find((c) => c.value === t)?.label ?? t;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-5xl font-light text-gray-900 tracking-tight">
            Campagnes
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            {campaigns.length} campagne{campaigns.length !== 1 ? "s" : ""}
          </p>
        </div>
        {usage.atLimit ? (
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 bg-gray-300 text-gray-500 text-sm font-medium px-4 py-2 rounded-xl cursor-not-allowed"
          >
            <Lock className="h-4 w-4" />
            Limite atteinte ({usage.current}/{usage.max})
          </Link>
        ) : (
          <Link
            href="/campaigns/new"
            className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nouvelle campagne
          </Link>
        )}
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-2xl border border-gray-200">
          <Megaphone className="mx-auto h-10 w-10 text-gray-300 mb-4" />
          <p className="text-gray-500 text-sm">Aucune campagne</p>
          <Link
            href="/campaigns/new"
            className="mt-4 inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline"
          >
            <Plus className="h-3 w-3" />
            Créer une campagne
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <Link
              key={campaign.id}
              href={`/campaigns/${campaign.id}`}
              className="bg-white border border-gray-200 rounded-2xl hover:border-gray-300 transition-colors p-5 block"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-gray-900 truncate text-sm">
                  {campaign.name}
                </p>
                <Badge status={campaign.status} className="shrink-0" />
              </div>

              <p className="text-xs text-gray-500 mt-1">
                {typeLabel(campaign.type)}
              </p>

              {(campaign.startAt || campaign.endAt) && (
                <p className="text-xs text-gray-400 mt-2">
                  {campaign.startAt ? formatDate(campaign.startAt) : "?"}
                  {campaign.endAt ? ` → ${formatDate(campaign.endAt)}` : ""}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-400">
                <span>{campaign.products.length} produit(s)</span>
                {campaign.event && <span>· {campaign.event.name}</span>}
                {campaign.budget && (
                  <span>
                    ·{" "}
                    {new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: campaign.currency ?? "EUR",
                      maximumFractionDigits: 0,
                    }).format(campaign.budget)}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
