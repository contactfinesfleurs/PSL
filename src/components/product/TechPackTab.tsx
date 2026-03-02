"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, RefreshCw } from "lucide-react";
import { cn, generateReference, PRODUCT_FAMILIES, SEASONS, SIZE_RANGES } from "@/lib/utils";
import { TagInput } from "@/components/ui/TagInput";
import { FileUpload } from "@/components/ui/FileUpload";

type MeasurementField = { key: string; label: string; unit: string };

const MEASUREMENT_FIELDS: Record<string, MeasurementField[]> = {
  "pret-a-porter": [
    { key: "poitrine", label: "Tour de poitrine", unit: "cm" },
    { key: "taille", label: "Tour de taille", unit: "cm" },
    { key: "hanches", label: "Tour de hanches", unit: "cm" },
    { key: "epaule", label: "Largeur épaule", unit: "cm" },
    { key: "mancheLongueur", label: "Longueur manche", unit: "cm" },
    { key: "longueurTotale", label: "Longueur totale", unit: "cm" },
    { key: "longueurDos", label: "Longueur dos", unit: "cm" },
  ],
  shoes: [
    { key: "hauteurTalon", label: "Hauteur talon", unit: "cm" },
    { key: "largeurSemelle", label: "Largeur semelle", unit: "cm" },
    { key: "hauteurTige", label: "Hauteur tige", unit: "cm" },
  ],
  "leather-goods": [
    { key: "hauteur", label: "Hauteur", unit: "cm" },
    { key: "largeur", label: "Largeur", unit: "cm" },
    { key: "profondeur", label: "Profondeur", unit: "cm" },
    { key: "longueurBandouliere", label: "Longueur bandoulière", unit: "cm" },
  ],
  "small-leather-goods": [
    { key: "hauteur", label: "Hauteur", unit: "cm" },
    { key: "largeur", label: "Largeur", unit: "cm" },
    { key: "profondeur", label: "Profondeur", unit: "cm" },
  ],
  accessories: [
    { key: "hauteur", label: "Hauteur", unit: "cm" },
    { key: "largeur", label: "Largeur", unit: "cm" },
    { key: "profondeur", label: "Profondeur", unit: "cm" },
  ],
  jewelry: [
    { key: "longueur", label: "Longueur", unit: "cm" },
    { key: "diametre", label: "Diamètre", unit: "mm" },
    { key: "taillePierre", label: "Taille pierre", unit: "mm" },
  ],
};

function parseMeasurements(s: string | null): Record<string, string> {
  if (!s) return {};
  try {
    const parsed = JSON.parse(s);
    if (typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, string>;
    return {};
  } catch {
    return {};
  }
}

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
  // refLocked=true → user has manually overridden the reference
  const [refLocked, setRefLocked] = useState(!!product.reference);

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
    measurements: parseMeasurements(product.measurements),
    reference: product.reference ?? "",
    sketchPaths: parse(product.sketchPaths),
    techPackPath: product.techPackPath,
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Derived reference computed from current form values
  const autoReference = generateReference({
    name: form.name,
    season: form.season,
    year: form.year,
    colors: form.colors,
    materials: form.materials,
  });

  // The reference value actually sent on save
  const effectiveReference = refLocked ? (form.reference || null) : autoReference;

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
        measurements: JSON.stringify(form.measurements),
        reference: effectiveReference,
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
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
        />
      </div>

      {/* Reference interne */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">
            Référence interne
          </label>
          <span className="text-xs text-gray-400">
            {refLocked ? "Saisie manuelle" : "Générée automatiquement"}
          </span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={refLocked ? form.reference : autoReference}
            readOnly={!refLocked}
            onChange={(e) => refLocked && set("reference", e.target.value)}
            className={cn(
              "flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-300",
              !refLocked && "bg-gray-50 text-gray-500 cursor-default"
            )}
          />
          <button
            type="button"
            onClick={() => {
              if (refLocked) {
                // Back to auto
                setRefLocked(false);
              } else {
                // Switch to manual, pre-fill with current auto value
                set("reference", autoReference);
                setRefLocked(true);
              }
            }}
            title={refLocked ? "Revenir à la référence automatique" : "Modifier manuellement"}
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 whitespace-nowrap"
          >
            <RefreshCw className="h-3 w-3" />
            {refLocked ? "Auto" : "Modifier"}
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
      <MeasurementsSection
        family={form.family}
        values={form.measurements}
        onChange={(v) => set("measurements", v)}
      />

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
          className="inline-flex items-center gap-2 bg-[#1D1D1F] hover:opacity-80 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-opacity"
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

function MeasurementsSection({
  family,
  values,
  onChange,
}: {
  family: string;
  values: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}) {
  const fields = MEASUREMENT_FIELDS[family];

  if (!fields) {
    // Generic textarea for families without structured fields (fragrance, other…)
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Mensurations / Notes techniques
        </label>
        <textarea
          value={values.__notes ?? ""}
          onChange={(e) => onChange({ ...values, __notes: e.target.value })}
          rows={4}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none"
        />
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">
        Mesures
      </label>
      <div className="grid grid-cols-2 gap-3">
        {fields.map(({ key, label, unit }) => (
          <div key={key}>
            <label className="block text-xs text-gray-500 mb-1">
              {label} <span className="text-gray-400">({unit})</span>
            </label>
            <input
              type="number"
              min={0}
              step="0.1"
              value={values[key] ?? ""}
              onChange={(e) => onChange({ ...values, [key]: e.target.value })}
              placeholder="—"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
