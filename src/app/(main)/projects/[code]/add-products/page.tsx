"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { X } from "lucide-react";

type Product = {
  id: string;
  name: string;
  sku: string;
  season: string;
  year: number;
};

export default function AddProductsPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [existingIds, setExistingIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/products?limit=100").then((r) => r.json()),
      fetch(`/api/projects/${code}`).then((r) => r.json()),
    ]).then(([productsData, projectData]) => {
      setProducts(productsData.data ?? []);
      const ids = new Set<string>(
        (projectData.products ?? []).map((p: Product) => p.id)
      );
      setExistingIds(ids);
    });
  }, [code]);

  const filtered = products
    .filter((p) => !existingIds.has(p.id))
    .filter(
      (p) =>
        search.trim() === "" ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase())
    );

  function toggleProduct(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.size === 0) return;
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/projects/${code}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds: Array.from(selectedIds) }),
    });

    if (res.ok) {
      router.push(`/projects/${code}`);
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Erreur lors de l'ajout.");
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-light text-gray-900">
        Ajouter des produits au projet
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou SKU…"
          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
        />

        {selectedIds.size > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {products
              .filter((p) => selectedIds.has(p.id))
              .map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-medium px-2.5 py-1 rounded-full"
                >
                  {p.name}
                  <button type="button" onClick={() => toggleProduct(p.id)}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
          </div>
        )}

        <div className="max-h-72 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              Tous vos produits sont déjà dans ce projet.
            </p>
          ) : (
            filtered.map((p) => {
              const checked = selectedIds.has(p.id);
              return (
                <label
                  key={p.id}
                  className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleProduct(p.id)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {p.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {p.sku} · {p.season} {p.year}
                    </p>
                  </div>
                </label>
              );
            })
          )}
        </div>
        <p className="text-xs text-gray-400">{selectedIds.size} produit(s) sélectionné(s)</p>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving || selectedIds.size === 0}
            className="bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white text-sm font-medium px-6 py-2 rounded-lg transition-colors"
          >
            {saving ? "Ajout…" : "Ajouter les produits"}
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
