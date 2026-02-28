"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { PRODUCT_FAMILIES, SEASONS, SIZE_RANGES } from "@/lib/utils";
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

  const parse = (s: string | null) => {
    if (!s) return [];
    try {
      return JSON.parse(s) as string[];
    } catch {
      return [];
    }
  };

  const [form, setForm] = useState({
    name: product.name,
    family: product.family,
    season: product.season,
    year: product.year,
    sizeRange: product.sizeRange,
    sizes: parse(product.sizes),
    materials: parse(product.materials),
    colors: parse(product.colors),
    measurements: product.measurements ?? "",
    reference: product.reference ?? "",
    sketchPaths: parse(product.sketchPaths),
    techPackPath: product.techPackPath,
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/products/${product.id}`, {
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
        colors: form.colors,
        measurements: form.measurements,
        reference: form.reference,
        sketchPaths: form.sketchPaths,
        techPackPath: form.techPackPath,
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    router.refresh();
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
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
        />
      </div>

      {/* Reference interne */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Référence interne
        </label>
        <input
          type="text"
          value={form.reference}
          onChange={(e) => set("reference", e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
        />
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
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
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
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
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
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
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
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
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
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Coloris
        </label>
        <TagInput
          value={form.colors}
          onChange={(v) => set("colors", v)}
          placeholder="ex. Noir, Ivoire"
          colorMode
        />
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
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
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
          className="inline-flex items-center gap-2 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
        >
          <Save className="h-4 w-4" />
          {saving ? "Sauvegarde…" : "Sauvegarder"}
        </button>
        {saved && (
          <span className="text-sm text-green-600 font-medium">
            ✓ Sauvegardé
          </span>
        )}
      </div>
    </div>
  );
}
