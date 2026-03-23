"use client";

import { Crown } from "lucide-react";
import { useState } from "react";

export function UpgradePrompt({
  resource,
  limit,
}: {
  resource: string;
  limit: number;
}) {
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "monthly" }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-indigo-900">
          Limite atteinte : {limit} {resource} maximum en plan gratuit
        </p>
        <p className="text-xs text-indigo-600 mt-1">
          Passez au plan Pro pour un accès illimité.
        </p>
      </div>
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shrink-0"
      >
        <Crown className="h-3.5 w-3.5" />
        {loading ? "Chargement…" : "Passer au Pro"}
      </button>
    </div>
  );
}
