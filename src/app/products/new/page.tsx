"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  PRODUCT_FAMILIES,
  SEASONS,
  SIZE_RANGES,
  COLOR_CODES,
  generateReference,
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
    colorPrimary: "",
    colorSecondary: "",
    measurements: "",
    sketchPaths: [] as string[],
    techPackPath: null as string | null,
  });

  // Live reference preview
  const referencePreview = useMemo(() => {
    if (!form.name.trim()) return null;
    return generateReference({
      name: form.name,
      season: form.season,
      year: form.year,
      material: form.materials[0] ?? null,
      colorPrimary: form.colorPrimary || null,
    });
  }, [form.name, form.season, form.year, form.materials, form.colorPrimary]);

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
        colorPrimary: form.colorPrimary || null,
        colorSecondary: form.colorSecondary || null,
        measurements: form.measurements || null,
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
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-light text-gray-900">Nouveau produit</h1>
        <p className="text-sm text-gray-500 mt-1">
          Remplissez les informations de base. La référence et le SKU seront générés automatiquement.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-2xl border border-gray-200 p-6">
        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">
            Nom du produit <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="ex. Veste Structurée Noire"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 bg-gray-50"
          />
        </div>

        {/* Reference preview */}
        {referencePreview && (
          <div className="flex items-center gap-4 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium mb-0.5">
                Référence générée
              </p>
              <p className="text-sm font-mono font-semibold text-gray-900">
                {referencePreview}
              </p>
            </div>
            <p className="text-xs text-gray-400 ml-auto text-right leading-tight">
              Initiales · Saison · Matière · Couleur
            </p>
          </div>
        )}

        {/* Family + Season + Year */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">
              Famille <span className="text-red-400">*</span>
            </label>
            <select
              value={form.family}
              onChange={(e) => set("family", e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 bg-gray-50"
            >
              {PRODUCT_FAMILIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">
              Saison <span className="text-red-400">*</span>
            </label>
            <select
              value={form.season}
              onChange={(e) => set("season", e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 bg-gray-50"
            >
              {SEASONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">
              Année <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              value={form.year}
              onChange={(e) => set("year", parseInt(e.target.value))}
              min={2020}
              max={2040}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 bg-gray-50"
            />
          </div>
        </div>

        {/* Size Range */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">
            Gamme de tailles <span className="text-red-400">*</span>
          </label>
          <select
            value={form.sizeRange}
            onChange={(e) => set("sizeRange", e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 bg-gray-50"
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
          <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">
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
          <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">
            Matières
          </label>
          <TagInput
            value={form.materials}
            onChange={(v) => set("materials", v)}
            placeholder="ex. Soie, Laine, Cachemire"
          />
          <p className="text-xs text-gray-400 mt-1">
            La première matière est utilisée dans la référence
          </p>
        </div>

        {/* Colors */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">
              Couleur principale
            </label>
            <select
              value={form.colorPrimary}
              onChange={(e) => set("colorPrimary", e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 bg-gray-50"
            >
              <option value="">— Sélectionner</option>
              {COLOR_CODES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">
              Couleur secondaire
            </label>
            <select
              value={form.colorSecondary}
              onChange={(e) => set("colorSecondary", e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 bg-gray-50"
            >
              <option value="">— Optionnel</option>
              {COLOR_CODES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Measurements */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">
            Mensurations / Notes techniques
          </label>
          <textarea
            value={form.measurements}
            onChange={(e) => set("measurements", e.target.value)}
            rows={3}
            placeholder="ex. Tour de poitrine : 86-92cm, Longueur dos : 68cm…"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 bg-gray-50 resize-none"
          />
        </div>

        {/* Sketches */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">
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
          <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">
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
        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
          <button
            type="submit"
            disabled={saving || !form.name.trim()}
            className="bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white text-sm font-medium px-6 py-2 rounded-xl transition-colors"
          >
            {saving ? "Création…" : "Créer le produit"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
