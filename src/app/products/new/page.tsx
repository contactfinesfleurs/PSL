"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PRODUCT_FAMILIES,
  SEASONS,
  SIZE_RANGES,
} from "@/lib/utils";
import { TagInput } from "@/components/ui/TagInput";
import { FileUpload } from "@/components/ui/FileUpload";

export default function NewProductPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const currentYear = new Date().getFullYear();

  const [form, setForm] = useState({
    name: "",
    family: "pret-a-porter",
    season: "FALL-WINTER",
    year: currentYear,
    sizeRange: "S-XL",
    sizes: [] as string[],
    materials: [] as string[],
    colors: [] as string[],
    measurements: "",
    reference: "",
    sketchPaths: [] as string[],
    techPackPath: null as string | null,
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    setSaving(true);

    const res = await fetch("/api/products", {
      method: "POST",
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
        measurements: form.measurements || null,
        reference: form.reference || null,
        sketchPaths: form.sketchPaths,
        techPackPath: form.techPackPath,
      }),
    });

    if (res.ok) {
      const product = await res.json();
      router.push(`/products/${product.id}`);
    } else {
      setSaving(false);
      alert("Erreur lors de la création du produit.");
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nouveau produit</h1>
        <p className="text-sm text-gray-500 mt-1">
          Remplissez les informations de base. La référence SKU sera générée automatiquement.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nom du produit <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="ex. Veste Structurée Noire"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>

        {/* Reference interne */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Référence interne (optionnel)
          </label>
          <input
            type="text"
            value={form.reference}
            onChange={(e) => set("reference", e.target.value)}
            placeholder="ex. REF-001"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>

        {/* Family + Season + Year */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Famille <span className="text-red-500">*</span>
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
              Saison <span className="text-red-500">*</span>
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
              Année <span className="text-red-500">*</span>
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
            Gamme de tailles <span className="text-red-500">*</span>
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
            placeholder="ex. S, M, L, XL — Entrée pour valider"
          />
          <p className="text-xs text-gray-400 mt-1">
            Tapez une taille et appuyez sur Entrée
          </p>
        </div>

        {/* Materials */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Matières
          </label>
          <TagInput
            value={form.materials}
            onChange={(v) => set("materials", v)}
            placeholder="ex. Soie, Laine, Cachemire"
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
            placeholder="ex. Noir, Ivoire, Rouge Sang"
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
            rows={3}
            placeholder="ex. Tour de poitrine : 86-92cm, Longueur dos : 68cm…"
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
            hint="Images ou PDF acceptés"
          />
        </div>

        {/* Tech Pack */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fiche technique (tech pack)
          </label>
          <FileUpload
            folder="techpacks"
            accept=".pdf,.doc,.docx,.xlsx,.xls"
            multiple={false}
            onUploaded={(paths) => set("techPackPath", paths[0] ?? null)}
            existingPaths={form.techPackPath ? [form.techPackPath] : []}
            label="Déposer la fiche technique"
            hint="PDF, Word ou Excel acceptés"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving || !form.name.trim()}
            className="bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white text-sm font-medium px-6 py-2 rounded-lg transition-colors"
          >
            {saving ? "Création…" : "Créer le produit"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
