"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  Calendar,
  Euro,
  Plus,
  Trash2,
  Save,
  Edit2,
  X,
} from "lucide-react";
import { CAMPAIGN_TYPES, formatDate } from "@/lib/utils";

type Product = { id: string; name: string; sku: string; family: string };
type Event = { id: string; name: string };
type Campaign = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  startAt: string | null;
  endAt: string | null;
  budget: number | null;
  currency: string | null;
  event: Event | null;
  products: {
    productId: string;
    notes: string | null;
    product: Product;
  }[];
};

export default function CampaignDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});
  const [selectedProduct, setSelectedProduct] = useState("");
  const [productNotes, setProductNotes] = useState("");
  const [addingProduct, setAddingProduct] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/campaigns/${params.id}`)
      .then((r) => r.json())
      .then(setCampaign);
    fetch("/api/products")
      .then((r) => r.json())
      .then(setAllProducts);
  }, [params.id]);

  if (!campaign) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Chargement…</div>
      </div>
    );
  }

  const typeLabel =
    CAMPAIGN_TYPES.find((c) => c.value === campaign.type)?.label ??
    campaign.type;

  const statusStyle: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-600",
    ACTIVE: "bg-blue-100 text-blue-700",
    PAUSED: "bg-yellow-100 text-yellow-700",
    COMPLETED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
  };
  const statusLabel: Record<string, string> = {
    DRAFT: "Brouillon",
    ACTIVE: "Active",
    PAUSED: "En pause",
    COMPLETED: "Terminée",
    CANCELLED: "Annulée",
  };

  const linkedProductIds = campaign.products.map((cp) => cp.product.id);
  const availableProducts = allProducts.filter(
    (p) => !linkedProductIds.includes(p.id)
  );

  async function saveEdit() {
    setSaving(true);
    const res = await fetch(`/api/campaigns/${campaign!.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    const updated = await res.json();
    setCampaign({ ...campaign!, ...updated });
    setEditing(false);
    setSaving(false);
  }

  async function changeStatus(status: string) {
    const res = await fetch(`/api/campaigns/${campaign!.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const updated = await res.json();
    setCampaign({ ...campaign!, ...updated });
  }

  async function addProduct() {
    if (!selectedProduct) return;
    setAddingProduct(true);
    await fetch(`/api/campaigns/${campaign!.id}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: selectedProduct, notes: productNotes }),
    });
    const updated = await fetch(`/api/campaigns/${campaign!.id}`).then((r) =>
      r.json()
    );
    setCampaign(updated);
    setSelectedProduct("");
    setProductNotes("");
    setAddingProduct(false);
  }

  async function removeProduct(productId: string) {
    await fetch(`/api/campaigns/${campaign!.id}/products`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    const updated = await fetch(`/api/campaigns/${campaign!.id}`).then((r) =>
      r.json()
    );
    setCampaign(updated);
  }

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href="/campaigns"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Retour aux campagnes
      </Link>

      {/* Header Card */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        {editing ? (
          <div className="space-y-4">
            <input
              type="text"
              value={(editForm.name as string) ?? campaign.name}
              onChange={(e) =>
                setEditForm({ ...editForm, name: e.target.value })
              }
              className="w-full text-xl font-bold border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Début</label>
                <input
                  type="date"
                  value={
                    ((editForm.startAt as string) ?? campaign.startAt)?.split("T")[0] ?? ""
                  }
                  onChange={(e) =>
                    setEditForm({ ...editForm, startAt: e.target.value || null })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Fin</label>
                <input
                  type="date"
                  value={
                    ((editForm.endAt as string) ?? campaign.endAt)?.split("T")[0] ?? ""
                  }
                  onChange={(e) =>
                    setEditForm({ ...editForm, endAt: e.target.value || null })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Budget</label>
                <input
                  type="number"
                  value={(editForm.budget as number) ?? campaign.budget ?? ""}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      budget: e.target.value
                        ? parseFloat(e.target.value)
                        : null,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
            </div>
            <textarea
              value={(editForm.description as string) ?? campaign.description ?? ""}
              onChange={(e) =>
                setEditForm({ ...editForm, description: e.target.value })
              }
              rows={2}
              placeholder="Description"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={saveEdit}
                disabled={saving}
                className="inline-flex items-center gap-1.5 bg-purple-700 hover:bg-purple-800 text-white text-sm font-medium px-4 py-2 rounded-lg"
              >
                <Save className="h-4 w-4" />
                Enregistrer
              </button>
              <button
                onClick={() => setEditing(false)}
                className="inline-flex items-center gap-1.5 border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm px-4 py-2 rounded-lg"
              >
                <X className="h-4 w-4" />
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {campaign.name}
                  </h1>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyle[campaign.status] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    {statusLabel[campaign.status] ?? campaign.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">{typeLabel}</p>
                {campaign.description && (
                  <p className="text-sm text-gray-600 mt-2">
                    {campaign.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setEditForm({});
                  setEditing(true);
                }}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg"
              >
                <Edit2 className="h-3.5 w-3.5" />
                Modifier
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
              {(campaign.startAt || campaign.endAt) && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  {campaign.startAt ? formatDate(campaign.startAt) : "?"}
                  {campaign.endAt ? ` → ${formatDate(campaign.endAt)}` : ""}
                </span>
              )}
              {campaign.budget && (
                <span className="flex items-center gap-1.5">
                  <Euro className="h-4 w-4 text-gray-400" />
                  {new Intl.NumberFormat("fr-FR", {
                    style: "currency",
                    currency: campaign.currency ?? "EUR",
                    maximumFractionDigits: 0,
                  }).format(campaign.budget)}
                </span>
              )}
              {campaign.event && (
                <Link
                  href={`/events/${campaign.event.id}`}
                  className="text-purple-600 hover:underline text-sm"
                >
                  Événement : {campaign.event.name}
                </Link>
              )}
            </div>

            {/* Status controls */}
            <div className="mt-4 flex flex-wrap gap-2">
              {["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"].map(
                (s) => (
                  <button
                    key={s}
                    onClick={() => changeStatus(s)}
                    disabled={campaign.status === s}
                    className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                      campaign.status === s
                        ? (statusStyle[s] ?? "bg-gray-100 text-gray-600") +
                          " border-transparent"
                        : "border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {statusLabel[s]}
                  </button>
                )
              )}
            </div>
          </>
        )}
      </div>

      {/* Products */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
          <Package className="h-4 w-4 text-gray-400" />
          Produits ({campaign.products.length})
        </h2>

        {campaign.products.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">
            Aucun produit dans cette campagne
          </p>
        ) : (
          <div className="space-y-2 mb-4">
            {campaign.products.map((cp) => (
              <div
                key={cp.product.id}
                className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3"
              >
                <Link
                  href={`/products/${cp.product.id}`}
                  className="min-w-0 hover:underline"
                >
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {cp.product.name}
                  </p>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">
                    {cp.product.sku}
                  </p>
                  {cp.notes && (
                    <p className="text-xs text-gray-500 mt-0.5 italic">
                      {cp.notes}
                    </p>
                  )}
                </Link>
                <button
                  onClick={() => removeProduct(cp.product.id)}
                  className="ml-3 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-gray-100 pt-4 space-y-2">
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <option value="">— Ajouter un produit —</option>
            {availableProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="text"
              value={productNotes}
              onChange={(e) => setProductNotes(e.target.value)}
              placeholder="Notes (optionnel)"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <button
              onClick={addProduct}
              disabled={!selectedProduct || addingProduct}
              className="inline-flex items-center gap-1 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
