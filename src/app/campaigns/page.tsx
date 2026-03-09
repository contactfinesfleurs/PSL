import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CAMPAIGN_TYPES, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Plus, Megaphone } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const campaigns = await prisma.campaign.findMany({
    include: { products: true, event: true },
    orderBy: { createdAt: "desc" },
  });

  const typeLabel = (t: string) =>
    CAMPAIGN_TYPES.find((c) => c.value === t)?.label ?? t;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campagnes</h1>
          <p className="text-sm text-gray-500 mt-1">
            {campaigns.length} campagne{campaigns.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/campaigns/new"
          className="inline-flex items-center gap-2 bg-purple-700 hover:bg-purple-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nouvelle campagne
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-xl border border-gray-200">
          <Megaphone className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">Aucune campagne</p>
          <Link
            href="/campaigns/new"
            className="mt-4 inline-flex items-center gap-1 text-sm text-purple-600 hover:underline"
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
              className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-gray-900 truncate">
                  {campaign.name}
                </p>
                <Badge status={campaign.status} className="shrink-0" />
              </div>

              <p className="text-xs text-gray-500 mt-1">
                {typeLabel(campaign.type)}
              </p>

              {(campaign.startAt || campaign.endAt) && (
                <p className="text-xs text-gray-500 mt-2">
                  {campaign.startAt ? formatDate(campaign.startAt) : "?"}
                  {campaign.endAt ? ` → ${formatDate(campaign.endAt)}` : ""}
                </p>
              )}

              <div className="mt-3 flex gap-3 text-xs text-gray-400">
                <span>{campaign.products.length} produit(s)</span>
                {campaign.event && (
                  <span>· {campaign.event.name}</span>
                )}
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
