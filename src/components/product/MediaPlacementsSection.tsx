"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

type MediaPlacement = {
  id: string;
  publication: string;
  type: string;
  publishedAt: string;
  url: string | null;
  reach: number | null;
  notes: string | null;
};

interface Props {
  productId: string;
  initialPlacements: MediaPlacement[];
}

const TYPE_LABELS: Record<string, string> = {
  PRINT: "Print",
  DIGITAL: "Digital",
  SOCIAL: "Social",
  TV: "TV",
  PODCAST: "Podcast",
};

const TYPE_STYLES: Record<string, string> = {
  PRINT: "bg-purple-100 text-purple-700",
  DIGITAL: "bg-blue-100 text-blue-700",
  SOCIAL: "bg-pink-100 text-pink-700",
  TV: "bg-orange-100 text-orange-700",
  PODCAST: "bg-yellow-100 text-yellow-700",
};

const defaultForm = {
  publication: "",
  type: "PRINT",
  publishedAt: "",
  url: "",
  reach: "",
  notes: "",
};

function formatReach(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n);
}

export function MediaPlacementsSection({ productId, initialPlacements }: Props) {
  const router = useRouter();
  const [placements, setPlacements] = useState<MediaPlacement[]>(initialPlacements);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const totalReach = placements.reduce((sum, p) => sum + (p.reach ?? 0), 0);

  function setField<K extends keyof typeof defaultForm>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const body: Record<string, string | number | null> = {
      publication: form.publication,
      type: form.type,
      publishedAt: new Date(form.publishedAt).toISOString(),
      url: form.url || null,
      reach: form.reach ? parseInt(form.reach, 10) : null,
      notes: form.notes || null,
    };

    const res = await fetch(`/api/products/${productId}/placements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const created = (await res.json()) as MediaPlacement;
      setPlacements((prev) => [created, ...prev]);
      setForm(defaultForm);
      setShowForm(false);
    }

    setSubmitting(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    setDeleting(id);

    const res = await fetch(`/api/placements/${id}`, { method: "DELETE" });

    if (res.ok) {
      setPlacements((prev) => prev.filter((p) => p.id !== id));
    }

    setDeleting(null);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h2 className="text-base font-semibold text-gray-800">
            Retombées médias
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {placements.length} retombée{placements.length !== 1 ? "s" : ""}
            {totalReach > 0 && (
              <>
                {" "}·{" "}
                <span className="text-purple-600">
                  {formatReach(totalReach)} audience cumulée
                </span>
              </>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors",
            showForm
              ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
              : "bg-gray-900 hover:bg-gray-800 text-white"
          )}
        >
          <Plus className="h-4 w-4" />
          {showForm ? "Annuler" : "Ajouter"}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="px-5 py-4 border-b border-gray-100 bg-gray-50 space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Publication <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.publication}
                onChange={(e) => setField("publication", e.target.value)}
                placeholder="Vogue France"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                value={form.type}
                onChange={(e) => setField("type", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white"
              >
                {Object.entries(TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Date de publication <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={form.publishedAt}
                onChange={(e) => setField("publishedAt", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Audience estimée
              </label>
              <input
                type="number"
                min={0}
                value={form.reach}
                onChange={(e) => setField("reach", e.target.value)}
                placeholder="Audience estimée"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              URL
            </label>
            <input
              type="url"
              value={form.url}
              onChange={(e) => setField("url", e.target.value)}
              placeholder="https://..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              rows={2}
              placeholder="Informations complémentaires…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {submitting ? "Enregistrement…" : "Enregistrer la retombée"}
            </button>
          </div>
        </form>
      )}

      {/* Placements list */}
      <div className="divide-y divide-gray-100">
        {placements.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-gray-400">
              Aucune retombée enregistrée pour ce produit
            </p>
          </div>
        ) : (
          placements.map((placement) => (
            <div
              key={placement.id}
              className="px-5 py-4 flex items-center gap-4"
            >
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {placement.publication}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full",
                      TYPE_STYLES[placement.type] ?? "bg-gray-100 text-gray-600"
                    )}
                  >
                    {TYPE_LABELS[placement.type] ?? placement.type}
                  </span>
                  {placement.url && (
                    <a
                      href={placement.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-gray-800 transition-colors"
                      title="Voir la publication"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  <span>{formatDate(placement.publishedAt)}</span>
                  {placement.reach != null && (
                    <span className="text-purple-600 font-medium">
                      {formatReach(placement.reach)} lecteurs
                    </span>
                  )}
                </div>
                {placement.notes && (
                  <p className="text-xs text-gray-400 italic">{placement.notes}</p>
                )}
              </div>

              <button
                onClick={() => handleDelete(placement.id)}
                disabled={deleting === placement.id}
                className="shrink-0 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50"
                title="Supprimer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
