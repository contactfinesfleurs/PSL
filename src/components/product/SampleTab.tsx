"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, FileText, Save } from "lucide-react";
import { FileUpload } from "@/components/ui/FileUpload";
import { TagInput } from "@/components/ui/TagInput";

type Sample = {
  id: string;
  samplePhotoPaths: string | null;
  detailPhotoPaths: string | null;
  reviewPhotoPaths: string | null;
  reviewNotes: string | null;
  packshotPaths: string | null;
  definitiveColors: string | null;
  definitiveMaterials: string | null;
} | null;

type Product = {
  id: string;
  name: string;
  sku: string;
  sampleStatus: string;
  description: string | null;
  metaTags: string | null;
  plannedLaunchAt: Date | null;
};

const parse = (s: string | null): string[] => {
  if (!s) return [];
  try {
    return JSON.parse(s) as string[];
  } catch {
    return [];
  }
};

export function SampleTab({
  product,
  sample,
}: {
  product: Product;
  sample: Sample;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);

  const [form, setForm] = useState({
    samplePhotoPaths: parse(sample?.samplePhotoPaths ?? null),
    detailPhotoPaths: parse(sample?.detailPhotoPaths ?? null),
    reviewPhotoPaths: parse(sample?.reviewPhotoPaths ?? null),
    reviewNotes: sample?.reviewNotes ?? "",
    // Final product fields (shown after validation)
    packshotPaths: parse(sample?.packshotPaths ?? null),
    definitiveColors: parse(sample?.definitiveColors ?? null),
    definitiveMaterials: parse(sample?.definitiveMaterials ?? null),
    description: product.description ?? "",
    metaTags: parse(product.metaTags),
    plannedLaunchAt: product.plannedLaunchAt
      ? new Date(product.plannedLaunchAt).toISOString().split("T")[0]
      : "",
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  async function saveSample() {
    setSaving(true);
    await fetch(`/api/products/${product.id}/sample`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sampleId: sample?.id,
        samplePhotoPaths: form.samplePhotoPaths,
        detailPhotoPaths: form.detailPhotoPaths,
        reviewPhotoPaths: form.reviewPhotoPaths,
        reviewNotes: form.reviewNotes,
        ...(product.sampleStatus === "VALIDATED" && {
          packshotPaths: form.packshotPaths,
          definitiveColors: form.definitiveColors,
          definitiveMaterials: form.definitiveMaterials,
        }),
      }),
    });

    if (product.sampleStatus === "VALIDATED") {
      await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: form.description,
          metaTags: form.metaTags,
          plannedLaunchAt: form.plannedLaunchAt || null,
        }),
      });
    }

    setSaving(false);
    router.refresh();
  }

  async function validate(status: "VALIDATED" | "NOT_VALIDATED") {
    setValidating(true);
    // Save sample first
    await fetch(`/api/products/${product.id}/sample`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sampleId: sample?.id,
        samplePhotoPaths: form.samplePhotoPaths,
        detailPhotoPaths: form.detailPhotoPaths,
        reviewPhotoPaths: form.reviewPhotoPaths,
        reviewNotes: form.reviewNotes,
      }),
    });

    // Update product status
    await fetch(`/api/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sampleStatus: status }),
    });

    setValidating(false);
    router.refresh();
  }

  function openPdfReport() {
    window.open(`/api/products/${product.id}/pdf`, "_blank");
  }

  const isValidated = product.sampleStatus === "VALIDATED";

  return (
    <div className="max-w-2xl space-y-8">
      {/* Status banner */}
      {product.sampleStatus !== "PENDING" && (
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
            isValidated
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {isValidated ? (
            <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
          ) : (
            <XCircle className="h-5 w-5 text-red-600 shrink-0" />
          )}
          <div>
            <p className="font-semibold text-sm">
              {isValidated ? "Prototype validé" : "Prototype non validé"}
            </p>
            <p className="text-xs mt-0.5 opacity-80">
              {isValidated
                ? "L'onglet Lancement est maintenant accessible."
                : "Un rapport PDF peut être généré pour le fournisseur."}
            </p>
          </div>
          {!isValidated && (
            <button
              onClick={openPdfReport}
              className="ml-auto flex items-center gap-1.5 text-xs font-medium bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              <FileText className="h-3.5 w-3.5" />
              Rapport PDF
            </button>
          )}
        </div>
      )}

      {/* Sample Photos */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-1">
          Photos du prototype
        </h2>
        <p className="text-xs text-gray-500 mb-3">
          Photos générales du prototype (face, dos, profils…)
        </p>
        <FileUpload
          folder={`samples/${product.id}`}
          accept="image/*"
          multiple
          onUploaded={(paths) => set("samplePhotoPaths", paths)}
          existingPaths={form.samplePhotoPaths}
          label="Ajouter des photos"
          hint="JPG, PNG, WEBP acceptés"
        />
      </section>

      {/* Detail Photos */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-1">
          Photos des détails importants
        </h2>
        <p className="text-xs text-gray-500 mb-3">
          Finitions, coutures, fermetures, étiquettes…
        </p>
        <FileUpload
          folder={`samples/${product.id}/details`}
          accept="image/*"
          multiple
          onUploaded={(paths) => set("detailPhotoPaths", paths)}
          existingPaths={form.detailPhotoPaths}
          label="Ajouter des photos de détails"
        />
      </section>

      {/* Review Photos + Notes */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-1">
          Détails à revoir
        </h2>
        <p className="text-xs text-gray-500 mb-3">
          Photos et notes des points qui nécessitent une correction par le fournisseur
        </p>
        <FileUpload
          folder={`samples/${product.id}/review`}
          accept="image/*"
          multiple
          onUploaded={(paths) => set("reviewPhotoPaths", paths)}
          existingPaths={form.reviewPhotoPaths}
          label="Photos des défauts / points à corriger"
        />
        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes de révision (instructions au fournisseur)
          </label>
          <textarea
            value={form.reviewNotes}
            onChange={(e) => set("reviewNotes", e.target.value)}
            rows={5}
            placeholder="Décrivez précisément les corrections à apporter…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
          />
        </div>
      </section>

      {/* Final Product Section (only when VALIDATED) */}
      {isValidated && (
        <section className="border-t border-gray-200 pt-8 space-y-6">
          <div>
            <h2 className="text-base font-semibold text-gray-800">
              Produit final
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Informations définitives après validation du prototype
            </p>
          </div>

          {/* Packshots */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Photos officielles (packshots)
            </label>
            <FileUpload
              folder={`samples/${product.id}/packshots`}
              accept="image/*"
              multiple
              onUploaded={(paths) => set("packshotPaths", paths)}
              existingPaths={form.packshotPaths}
              label="Ajouter les packshots officiels"
            />
          </div>

          {/* Definitive Colors */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Codes couleurs définitifs
            </label>
            <TagInput
              value={form.definitiveColors}
              onChange={(v) => set("definitiveColors", v)}
              placeholder="ex. #000000, Pantone 19-4005"
              colorMode
            />
          </div>

          {/* Definitive Materials */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Matières définitives
            </label>
            <TagInput
              value={form.definitiveMaterials}
              onChange={(v) => set("definitiveMaterials", v)}
              placeholder="ex. Soie 100%, Laine vierge"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description produit
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
              placeholder="Description commerciale du produit…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
            />
          </div>

          {/* Meta Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Meta-tags SEO
            </label>
            <TagInput
              value={form.metaTags}
              onChange={(v) => set("metaTags", v)}
              placeholder="ex. robe, soirée, luxe, noir"
            />
          </div>

          {/* Planned Launch */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date de lancement prévue
            </label>
            <input
              type="date"
              value={form.plannedLaunchAt}
              onChange={(e) => set("plannedLaunchAt", e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>
        </section>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100">
        <button
          onClick={saveSample}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
        >
          <Save className="h-4 w-4" />
          {saving ? "Sauvegarde…" : "Sauvegarder"}
        </button>

        {!isValidated && (
          <>
            <button
              onClick={() => validate("VALIDATED")}
              disabled={validating}
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
            >
              <CheckCircle className="h-4 w-4" />
              VALIDER
            </button>
            <button
              onClick={() => validate("NOT_VALIDATED")}
              disabled={validating}
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
            >
              <XCircle className="h-4 w-4" />
              NON VALIDÉ
            </button>
          </>
        )}

        {product.sampleStatus === "NOT_VALIDATED" && (
          <button
            onClick={openPdfReport}
            className="inline-flex items-center gap-2 border border-red-300 text-red-700 hover:bg-red-50 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <FileText className="h-4 w-4" />
            Générer le rapport PDF fournisseur
          </button>
        )}
      </div>
    </div>
  );
}
