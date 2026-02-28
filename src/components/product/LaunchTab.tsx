"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Tag, Calendar, Trash2 } from "lucide-react";
import { cn, CAMPAIGN_TYPES, formatDate } from "@/lib/utils";

type Campaign = {
  id: string;
  name: string;
  type: string;
  status: string;
};

type CampaignProduct = {
  campaign: Campaign;
};

type Event = {
  id: string;
  name: string;
  type: string;
  startAt: Date;
};

type EventProduct = {
  event: Event;
};

type Product = {
  id: string;
  name: string;
  sku: string;
  plannedLaunchAt: Date | null;
  campaigns: CampaignProduct[];
  events: EventProduct[];
};

export function LaunchTab({
  product,
  allCampaigns,
}: {
  product: Product;
  allCampaigns: Campaign[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [notes, setNotes] = useState("");

  const linkedCampaignIds = product.campaigns.map((cp) => cp.campaign.id);
  const availableCampaigns = allCampaigns.filter(
    (c) => !linkedCampaignIds.includes(c.id)
  );

  async function addCampaign() {
    if (!selectedCampaign) return;
    setAdding(true);

    await fetch(`/api/campaigns/${selectedCampaign}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id, notes }),
    });

    setSelectedCampaign("");
    setNotes("");
    setAdding(false);
    router.refresh();
  }

  async function removeCampaign(campaignId: string) {
    await fetch(`/api/campaigns/${campaignId}/products`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id }),
    });
    router.refresh();
  }

  const typeLabel = (t: string) =>
    CAMPAIGN_TYPES.find((c) => c.value === t)?.label ?? t;

  const campaignStatusStyle: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-600",
    ACTIVE: "bg-blue-100 text-blue-700",
    PAUSED: "bg-yellow-100 text-yellow-700",
    COMPLETED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
  };

  const campaignStatusLabel: Record<string, string> = {
    DRAFT: "Brouillon",
    ACTIVE: "Active",
    PAUSED: "En pause",
    COMPLETED: "Terminée",
    CANCELLED: "Annulée",
  };

  return (
    <div className="max-w-2xl space-y-8">
      {/* Launch Date Summary */}
      {product.plannedLaunchAt && (
        <div className="flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-lg px-4 py-3">
          <Calendar className="h-5 w-5 text-purple-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-purple-800">
              Lancement prévu
            </p>
            <p className="text-sm text-purple-700">
              {formatDate(product.plannedLaunchAt)}
            </p>
          </div>
        </div>
      )}

      {/* Campaigns */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-800">
              Campagnes associées
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {product.campaigns.length} campagne
              {product.campaigns.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Existing campaigns */}
        {product.campaigns.length === 0 ? (
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg px-4 py-8 text-center">
            <Tag className="mx-auto h-8 w-8 text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">
              Aucune campagne associée à ce produit
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {product.campaigns.map(({ campaign }) => (
              <div
                key={campaign.id}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {campaign.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500">
                      {typeLabel(campaign.type)}
                    </span>
                    <span
                      className={cn(
                        "text-xs font-medium px-1.5 py-0.5 rounded",
                        campaignStatusStyle[campaign.status] ??
                          "bg-gray-100 text-gray-600"
                      )}
                    >
                      {campaignStatusLabel[campaign.status] ?? campaign.status}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => removeCampaign(campaign.id)}
                  className="ml-3 text-gray-400 hover:text-red-500 transition-colors"
                  title="Retirer de la campagne"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add campaign */}
        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-gray-700">
            Ajouter à une campagne
          </h3>
          {availableCampaigns.length === 0 ? (
            <p className="text-xs text-gray-500">
              Toutes les campagnes disponibles ont déjà été associées. Créez
              une nouvelle campagne depuis le menu{" "}
              <a href="/campaigns/new" className="text-purple-600 hover:underline">
                Campagnes
              </a>
              .
            </p>
          ) : (
            <>
              <select
                value={selectedCampaign}
                onChange={(e) => setSelectedCampaign(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <option value="">— Choisir une campagne —</option>
                {availableCampaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({typeLabel(c.type)})
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes (optionnel)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <button
                onClick={addCampaign}
                disabled={!selectedCampaign || adding}
                className="inline-flex items-center gap-2 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                {adding ? "Ajout…" : "Ajouter à la campagne"}
              </button>
            </>
          )}
        </div>
      </section>

      {/* Events */}
      {product.events.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-4">
            Événements associés
          </h2>
          <div className="space-y-2">
            {product.events.map(({ event }) => (
              <a
                key={event.id}
                href={`/events/${event.id}`}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {event.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    <Calendar className="inline h-3 w-3 mr-1" />
                    {formatDate(event.startAt)}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
