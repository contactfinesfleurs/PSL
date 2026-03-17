"use client";

import { useState } from "react";
import { Crown } from "lucide-react";

export function SettingsActions({
  isPro,
  hasStripeCustomer,
  showPricing,
}: {
  isPro: boolean;
  hasStripeCustomer: boolean;
  showPricing?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  async function handleUpgrade(plan: "monthly" | "yearly") {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      setLoading(false);
    }
  }

  async function handleManage() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      setLoading(false);
    }
  }

  if (isPro && hasStripeCustomer) {
    return (
      <button
        onClick={handleManage}
        disabled={loading}
        className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 transition-colors"
      >
        {loading ? "Chargement…" : "Gérer l'abonnement"}
      </button>
    );
  }

  if (showPricing) {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={() => handleUpgrade("monthly")}
          disabled={loading}
          className="inline-flex items-center gap-1.5 bg-white text-gray-900 text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
        >
          <Crown className="h-3.5 w-3.5" />
          11,99&euro;/mois
        </button>
        <button
          onClick={() => handleUpgrade("yearly")}
          disabled={loading}
          className="inline-flex items-center gap-1.5 bg-indigo-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-indigo-600 disabled:opacity-50 transition-colors"
        >
          99,99&euro;/an
          <span className="text-indigo-200 text-xs ml-1">(-30%)</span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => handleUpgrade("monthly")}
      disabled={loading}
      className="inline-flex items-center gap-1.5 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
    >
      <Crown className="h-3.5 w-3.5" />
      {loading ? "Chargement…" : "Passer au Pro"}
    </button>
  );
}
