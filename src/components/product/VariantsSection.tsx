"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Link2 } from "lucide-react";
import { COLOR_CODES } from "@/lib/utils";

type Variant = {
  id: string;
  name: string;
  sku: string;
  colors: string | null;
  family: string;
};

type ProductSuggestion = Variant & { season: string; year: number };

function colorLabel(code: string) {
  return COLOR_CODES.find((c) => c.code === code)?.label ?? code;
}

function colorDot(colors: string | null) {
  try {
    const codes: string[] = colors ? JSON.parse(colors) : [];
    if (!codes.length) return null;
    const label = codes.map(colorLabel).join(" / ");
    return (
      <span
        title={label}
        className="inline-flex items-center gap-1 text-xs text-gray-500"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-gray-400 shrink-0" />
        {label}
      </span>
    );
  } catch {
    return null;
  }
}

export function VariantsSection({
  productId,
  variantGroupId,
}: {
  productId: string;
  variantGroupId: string | null;
}) {
  const router = useRouter();
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [allProducts, setAllProducts] = useState<ProductSuggestion[]>([]);
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch current variants
  const fetchVariants = useCallback(async () => {
    const res = await fetch(`/api/products/${productId}/variants`);
    if (res.ok) setVariants(await res.json());
    setLoading(false);
  }, [productId]);

  useEffect(() => { fetchVariants(); }, [fetchVariants]);

  // Fetch all products for suggestion list (once, when search opens)
  async function openSearch() {
    setShowSearch(true);
    setTimeout(() => inputRef.current?.focus(), 50);
    if (allProducts.length === 0) {
      const res = await fetch(`/api/products?limit=500`);
      if (res.ok) {
        const body = await res.json();
        setAllProducts(body.data ?? []);
      }
    }
  }

  // Filter suggestions client-side
  useEffect(() => {
    const q = search.toLowerCase().trim();
    const linkedIds = new Set([productId, ...variants.map((v) => v.id)]);
    const filtered = allProducts
      .filter((p) => !linkedIds.has(p.id))
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q)
      )
      .slice(0, 8);
    setSuggestions(filtered);
  }, [search, allProducts, variants, productId]);

  async function handleLink(variantId: string) {
    setLinking(true);
    try {
      const res = await fetch(`/api/products/${productId}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId }),
      });
      if (res.ok) {
        setVariants(await res.json());
        setSearch("");
        setShowSearch(false);
        router.refresh();
      }
    } finally {
      setLinking(false);
    }
  }

  async function handleUnlink(variantId: string) {
    setUnlinking(variantId);
    try {
      const res = await fetch(`/api/products/${productId}/variants/${variantId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setVariants((prev) => prev.filter((v) => v.id !== variantId));
        router.refresh();
      }
    } finally {
      setUnlinking(null);
    }
  }

  if (loading) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-medium text-gray-700">
          Variantes couleur
        </label>
        {!showSearch && (
          <button
            type="button"
            onClick={openSearch}
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter
          </button>
        )}
      </div>

      {/* Existing variants */}
      {variants.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {variants.map((v) => (
            <div
              key={v.id}
              className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 group"
            >
              <Link2 className="h-3 w-3 text-gray-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate max-w-[120px]">{v.name}</p>
                {colorDot(v.colors)}
              </div>
              <button
                type="button"
                onClick={() => handleUnlink(v.id)}
                disabled={unlinking === v.id}
                title="Dissocier"
                className="ml-1 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {variants.length === 0 && !showSearch && (
        <p className="text-sm text-gray-400 italic">
          Aucune variante — liez d&apos;autres coloris du même modèle.
        </p>
      )}

      {/* Search input */}
      {showSearch && (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un produit par nom ou SKU…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            disabled={linking}
          />
          <button
            type="button"
            onClick={() => { setShowSearch(false); setSearch(""); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>

          {suggestions.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
              {suggestions.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => handleLink(s.id)}
                    disabled={linking}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-3 disabled:opacity-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-800 truncate">{s.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{s.sku}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      {colorDot(s.colors)}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {search.length >= 1 && suggestions.length === 0 && (
            <p className="absolute mt-1 w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400 shadow-lg">
              Aucun produit trouvé
            </p>
          )}
        </div>
      )}
    </div>
  );
}
