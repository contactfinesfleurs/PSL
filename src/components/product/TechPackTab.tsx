"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Save, RefreshCw } from "lucide-react";
import { PRODUCT_FAMILIES, SEASONS, SIZE_RANGES, COLOR_CODES, generateReference, safeParseArray } from "@/lib/utils";
import { TagInput } from "@/components/ui/TagInput";
import { FileUpload } from "@/components/ui/FileUpload";

type Product = {
  id: string;
  name: string;
  family: string;
  season: string;
  year: number;
  sizeRange: string;
  sizes: string;
  materials: string | null;
  colors: string | null;
  measurements: string | null;
  sketchPaths: string | null;
  techPackPath: string | null;
  reference: string | null;
};

export function TechPackTab({ product }: { product: Product }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: product.name,
    family: product.family,
    season: product.season,
    year: product.year,
    sizeRange: product.sizeRange,
    sizes: safeParseArray(product.sizes),
    materials: safeParseArray(product.materials),
    colorPrimary: safeParseArray(product.colors)[0] ?? "",
    colorSecondary: safeParseArray(product.colors)[1] ?? "",
    measurements: product.measurements ?? "",
    reference: product.reference ?? "",
    sketchPaths: safeParseArray(product.sketchPaths),
    techPackPath: product.techPackPath,
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const generatedReference = useMemo(
    () =>
      generateReference({
        name: form.name,
        season: form.season,
        year: form.year,
        material: form.materials[0] ?? null,
        colorPrimary: form.colorPrimary || null,
      }),
    [form.name, form.season, form.year, form.materials, form.colorPrimary]
  );

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          family: form.family,
          season: form.season,
          year: form.year,
          sizeRange: form.sizeRange,
          sizes: form.sizes,
          materials: form.materials,
          colorPrimary: form.colorPrimary || null,
          colorSecondary: form.colorSecondary || null,
          measurements: form.measurements || null,
          reference: form.reference,
          sketchPaths: form.sketchPaths,
          techPackPath: form.techPackPath,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setSaveError(body?.error ?? `Erreur ${res.status}`);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
        router.refresh();
      }
    } catch {
      setSaveError("Erreur réseau, réessayez.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nom du produit
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
        />
      </div>

      {/* Reference interne */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Référence interne
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={form.reference}
            onChange={(e) => set("reference", e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
          <button
            type="button"
            onClick={() => set("reference", generatedReference)}
            title={`Régénérer : ${generatedReference}`}
            className="inline-flex items-center gap-1.5 border border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700 text-xs font-medium px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {generatedReference}
          </button>
        </div>
      </div>

      {/* Family + Season + Year */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Famille
          </label>
          <select
            value={form.family}
            onChange={(e) => set("family", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            {PRODUCT_FAMILIES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Saison
          </label>
          <select
            value={form.season}
            onChange={(e) => set("season", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            {SEASONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Année
          </label>
          <input
            type="number"
            value={form.year}
            onChange={(e) => set("year", parseInt(e.target.value))}
            min={2020}
            max={2040}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
        </div>
      </div>

      {/* Size Range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Gamme de tailles
        </label>
        <select
          value={form.sizeRange}
          onChange={(e) => set("sizeRange", e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
        >
          {SIZE_RANGES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Sizes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tailles disponibles
        </label>
        <TagInput
          value={form.sizes}
          onChange={(v) => set("sizes", v)}
          placeholder="Ajouter une taille…"
        />
      </div>

      {/* Materials */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Matières
        </label>
        <TagInput
          value={form.materials}
          onChange={(v) => set("materials", v)}
          placeholder="ex. Soie, Laine"
        />
      </div>

      {/* Colors */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Couleur principale
          </label>
          <select
            value={form.colorPrimary}
            onChange={(e) => set("colorPrimary", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            <option value="">— Sélectionner</option>
            {COLOR_CODES.map((c) => (
              <option key={c.code} value={c.code}>{c.code} — {c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Couleur secondaire
          </label>
          <select
            value={form.colorSecondary}
            onChange={(e) => set("colorSecondary", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            <option value="">— Optionnel</option>
            {COLOR_CODES.map((c) => (
              <option key={c.code} value={c.code}>{c.code} — {c.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Measurements */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Mensurations / Notes techniques
        </label>
        <textarea
          value={form.measurements}
          onChange={(e) => set("measurements", e.target.value)}
          rows={4}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none"
        />
      </div>

      {/* Sketches */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Croquis / Dessins techniques
        </label>
        <FileUpload
          folder="sketches"
          accept="image/*,.pdf"
          multiple
          onUploaded={(paths) => set("sketchPaths", paths)}
          existingPaths={form.sketchPaths}
          label="Déposer des croquis"
          hint="Images ou PDF"
        />
      </div>

      {/* Tech Pack File */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Fiche technique (tech pack)
        </label>
        <FileUpload
          folder="techpacks"
          accept=".pdf,.doc,.docx,.xlsx,.xls"
          multiple={false}
          onUploaded={(paths) =>
            set("techPackPath", paths[0] ?? null)
          }
          existingPaths={form.techPackPath ? [form.techPackPath] : []}
          label="Déposer la fiche technique"
          hint="PDF, Word ou Excel"
        />
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
        >
          <Save className="h-4 w-4" />
          {saving ? "Sauvegarde…" : "Sauvegarder"}
        </button>
        {saved && (
          <span className="text-sm text-green-600 font-medium">
            ✓ Sauvegardé
          </span>
        )}
        {saveError && (
          <span className="text-sm text-red-600 font-medium">
            ✗ {saveError}
          </span>
        )}
      </div>
    </div>
  );
}
