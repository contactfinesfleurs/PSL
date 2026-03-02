"use client";

import { use, useEffect, useState, Fragment } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Package,
  Tag,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Check,
} from "lucide-react";
import { cn, EVENT_TYPES, CAMPAIGN_TYPES, formatDate } from "@/lib/utils";

type Product = { id: string; name: string; sku: string; family: string };
type Campaign = {
  id: string;
  name: string;
  type: string;
  status: string;
  startAt: string | null;
  endAt: string | null;
};
type Event = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  startAt: string;
  endAt: string | null;
  location: string | null;
  venue: string | null;
  createdAt: string;
  products: { event: never; product: Product; look: number | null; notes: string | null }[];
  campaigns: Campaign[];
};

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Event>>({});
  const [addingProduct, setAddingProduct] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [lookNumber, setLookNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/events/${id}`)
      .then((r) => r.json())
      .then(setEvent);
    fetch("/api/products")
      .then((r) => r.json())
      .then(setAllProducts);
  }, [id]);

  if (!event) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Chargement…</div>
      </div>
    );
  }

  const typeLabel =
    EVENT_TYPES.find((e) => e.value === event.type)?.label ?? event.type;

  const statusStyle: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-600",
    CONFIRMED: "bg-blue-100 text-blue-700",
    COMPLETED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
  };
  const statusLabel: Record<string, string> = {
    DRAFT: "Brouillon",
    CONFIRMED: "Confirmé",
    COMPLETED: "Terminé",
    CANCELLED: "Annulé",
  };

  const linkedProductIds = event.products.map((ep) => ep.product.id);
  const availableProducts = allProducts.filter(
    (p) => !linkedProductIds.includes(p.id)
  );

  async function saveEdit() {
    setSaving(true);
    const res = await fetch(`/api/events/${event!.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    const updated = await res.json();
    setEvent({ ...event!, ...updated });
    setEditing(false);
    setSaving(false);
  }

  async function addProduct() {
    if (!selectedProduct) return;
    setAddingProduct(true);
    await fetch(`/api/events/${event!.id}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: selectedProduct,
        look: lookNumber ? parseInt(lookNumber) : null,
      }),
    });
    const updated = await fetch(`/api/events/${event!.id}`).then((r) =>
      r.json()
    );
    setEvent(updated);
    setSelectedProduct("");
    setLookNumber("");
    setAddingProduct(false);
  }

  async function removeProduct(productId: string) {
    await fetch(`/api/events/${event!.id}/products`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    const updated = await fetch(`/api/events/${event!.id}`).then((r) =>
      r.json()
    );
    setEvent(updated);
  }

  async function changeStatus(status: string) {
    const res = await fetch(`/api/events/${event!.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const updated = await res.json();
    setEvent({ ...event!, ...updated });
  }

  async function handleDelete() {
    if (!confirm(`Supprimer "${event!.name}" ? Cette action est irréversible.`)) return;
    setDeleting(true);
    await fetch(`/api/events/${event!.id}`, { method: "DELETE" });
    router.push("/events");
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Back */}
      <Link
        href="/events"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Retour aux événements
      </Link>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        {editing ? (
          <div className="space-y-4">
            <input
              type="text"
              value={editForm.name ?? event.name}
              onChange={(e) =>
                setEditForm({ ...editForm, name: e.target.value })
              }
              className="w-full text-xl font-light border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Début</label>
                <input
                  type="date"
                  value={(editForm.startAt ?? event.startAt)?.split("T")[0]}
                  onChange={(e) =>
                    setEditForm({ ...editForm, startAt: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Fin</label>
                <input
                  type="date"
                  value={(editForm.endAt ?? event.endAt)?.split("T")[0] ?? ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, endAt: e.target.value || null })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Ville</label>
                <input
                  type="text"
                  value={editForm.location ?? event.location ?? ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, location: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Salle</label>
                <input
                  type="text"
                  value={editForm.venue ?? event.venue ?? ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, venue: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
              </div>
            </div>
            <textarea
              value={editForm.description ?? event.description ?? ""}
              onChange={(e) =>
                setEditForm({ ...editForm, description: e.target.value })
              }
              rows={2}
              placeholder="Description"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={saveEdit}
                disabled={saving}
                className="inline-flex items-center gap-1.5 bg-[#1D1D1F] hover:opacity-80 text-white text-sm font-medium px-4 py-2 rounded-lg"
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
                  <h1 className="text-2xl font-light text-gray-900">
                    {event.name}
                  </h1>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyle[event.status] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    {statusLabel[event.status] ?? event.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">{typeLabel}</p>
                {event.description && (
                  <p className="text-sm text-gray-600 mt-2">
                    {event.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
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
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  title="Supprimer l'événement"
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-gray-400" />
                {formatDate(event.startAt)}
                {event.endAt ? ` → ${formatDate(event.endAt)}` : ""}
              </span>
              {event.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  {event.location}
                  {event.venue ? ` — ${event.venue}` : ""}
                </span>
              )}
            </div>

            {/* Status controls */}
            <div className="mt-4 flex flex-wrap gap-2">
              {["DRAFT", "CONFIRMED", "COMPLETED", "CANCELLED"].map((s) => (
                <button
                  key={s}
                  onClick={() => changeStatus(s)}
                  disabled={event.status === s}
                  className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                    event.status === s
                      ? (statusStyle[s] ?? "bg-gray-100 text-gray-600") +
                        " border-transparent"
                      : "border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {statusLabel[s]}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Timeline */}
      <EventTimeline event={event} />

      {/* Products */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Package className="h-4 w-4 text-gray-400" />
            Produits ({event.products.length})
          </h2>
        </div>

        {event.products.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">
            Aucun produit associé à cet événement
          </p>
        ) : (
          <div className="space-y-2 mb-4">
            {event.products
              .sort((a, b) => (a.look ?? 999) - (b.look ?? 999))
              .map((ep) => (
                <div
                  key={ep.product.id}
                  className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3"
                >
                  <Link
                    href={`/products/${ep.product.id}`}
                    className="min-w-0 hover:underline"
                  >
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {ep.look !== null && (
                        <span className="mr-2 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">
                          Look {ep.look}
                        </span>
                      )}
                      {ep.product.name}
                    </p>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">
                      {ep.product.sku}
                    </p>
                  </Link>
                  <button
                    onClick={() => removeProduct(ep.product.id)}
                    className="ml-3 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
          </div>
        )}

        {/* Add product */}
        <div className="border-t border-gray-100 pt-4 space-y-2">
          <div className="flex gap-2">
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              <option value="">— Ajouter un produit —</option>
              {availableProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
            <input
              type="number"
              value={lookNumber}
              onChange={(e) => setLookNumber(e.target.value)}
              placeholder="Look #"
              className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
            <button
              onClick={addProduct}
              disabled={!selectedProduct || addingProduct}
              className="inline-flex items-center gap-1 bg-[#1D1D1F] hover:opacity-80 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-opacity"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Campaigns */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
          <Tag className="h-4 w-4 text-gray-400" />
          Campagnes ({event.campaigns.length})
        </h2>
        {event.campaigns.length === 0 ? (
          <p className="text-sm text-gray-400 py-2 text-center">
            Aucune campagne liée à cet événement.{" "}
            <Link href="/campaigns/new" className="text-[#1D1D1F] hover:underline">
              Créer une campagne
            </Link>
          </p>
        ) : (
          <div className="space-y-2">
            {event.campaigns.map((c) => (
              <Link
                key={c.id}
                href={`/campaigns/${c.id}`}
                className="flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-lg px-4 py-3 transition-colors"
              >
                <p className="text-sm font-medium text-gray-900">{c.name}</p>
                <span className="text-xs text-gray-500">{c.type}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Event Timeline ──────────────────────────────────────────────────────────

type TimelineItem = {
  date: Date;
  label: string;
  sublabel?: string;
  past: boolean;
  kind: "meta" | "main" | "campaign";
};

function EventTimeline({ event }: { event: Event }) {
  const now = new Date();

  const items: TimelineItem[] = [
    {
      date: new Date(event.createdAt),
      label: "Événement créé",
      past: true,
      kind: "meta",
    },
    {
      date: new Date(event.startAt),
      label: "Début",
      sublabel: [event.location, event.venue].filter(Boolean).join(" — ") || undefined,
      past: new Date(event.startAt) < now,
      kind: "main",
    },
    ...(event.endAt
      ? ([{
          date: new Date(event.endAt),
          label: "Fin",
          past: new Date(event.endAt) < now,
          kind: "main",
        }] as TimelineItem[])
      : []),
    ...event.campaigns
      .filter((c) => c.startAt)
      .map((c): TimelineItem => ({
        date: new Date(c.startAt!),
        label: c.name,
        sublabel: CAMPAIGN_TYPES.find((t) => t.value === c.type)?.label,
        past: new Date(c.startAt!) < now,
        kind: "campaign",
      })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  if (items.length === 0) return null;

  const dotClass = (item: TimelineItem) => {
    if (item.kind === "main")
      return item.past
        ? "bg-[#1D1D1F] border-[#1D1D1F]"
        : "bg-white border-[#1D1D1F]";
    if (item.kind === "campaign")
      return item.past
        ? "bg-blue-500 border-blue-500"
        : "bg-white border-blue-300";
    return item.past ? "bg-gray-400 border-gray-400" : "bg-white border-gray-300";
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-5">
        Frise chronologique
      </h2>
      <div className="relative">
        {/* Vertical connector line */}
        <div className="absolute left-[6px] top-2 bottom-2 w-px bg-gray-200" />
        <div className="space-y-5">
          {items.map((item, i) => (
            <Fragment key={i}>
              <div className="flex items-start gap-4 relative">
                {/* Dot */}
                <div
                  className={cn(
                    "mt-0.5 h-3.5 w-3.5 rounded-full border-2 flex-shrink-0 z-10 flex items-center justify-center",
                    dotClass(item)
                  )}
                >
                  {item.past && item.kind === "main" && (
                    <Check className="h-2.5 w-2.5 text-white" />
                  )}
                </div>
                {/* Content */}
                <div className="min-w-0 -mt-0.5">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        item.past ? "text-gray-900" : "text-gray-500"
                      )}
                    >
                      {item.label}
                    </p>
                    <p className="text-xs text-gray-400 tabular-nums">
                      {formatDate(item.date)}
                    </p>
                  </div>
                  {item.sublabel && (
                    <p className="text-xs text-gray-400 mt-0.5">{item.sublabel}</p>
                  )}
                </div>
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
