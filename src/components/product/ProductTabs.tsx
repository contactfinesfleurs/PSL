"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clipboard } from "lucide-react";
import { cn, PRODUCT_FAMILIES, SEASONS } from "@/lib/utils";
import { TechPackTab } from "./TechPackTab";
import { SampleTab } from "./SampleTab";
import { LaunchTab } from "./LaunchTab";

type Product = {
  id: string;
  name: string;
  sku: string;
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
  sampleStatus: string;
  description: string | null;
  metaTags: string | null;
  plannedLaunchAt: Date | null;
  reference: string | null;
  samples: {
    id: string;
    samplePhotoPaths: string | null;
    detailPhotoPaths: string | null;
    reviewPhotoPaths: string | null;
    reviewNotes: string | null;
    packshotPaths: string | null;
    definitiveColors: string | null;
    definitiveMaterials: string | null;
  }[];
  campaigns: {
    campaign: { id: string; name: string; type: string; status: string };
  }[];
  events: {
    event: { id: string; name: string; type: string; startAt: Date };
  }[];
};

const TABS = [
  { id: "techpack", label: "Tech Pack" },
  { id: "sample", label: "Prototype" },
  { id: "launch", label: "Lancement" },
];

export function ProductTabs({
  product,
  allCampaigns,
  activeTab,
}: {
  product: Product;
  allCampaigns: { id: string; name: string; type: string; status: string }[];
  activeTab: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState(activeTab);

  const familyLabel =
    PRODUCT_FAMILIES.find((f) => f.value === product.family)?.label ??
    product.family;
  const seasonLabel =
    SEASONS.find((s) => s.value === product.season)?.label ?? product.season;

  function copyToClipboard() {
    navigator.clipboard.writeText(product.sku);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/products"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour aux produits
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={copyToClipboard}
                title="Copier la référence"
                className="inline-flex items-center gap-1 text-xs font-mono text-gray-500 hover:text-purple-700 transition-colors"
              >
                <Clipboard className="h-3 w-3" />
                {product.sku}
              </button>
              <span className="text-gray-300">·</span>
              <span className="text-xs text-gray-500">
                {familyLabel} · {seasonLabel} {product.year}
              </span>
            </div>
          </div>
          <StatusBadge status={product.sampleStatus} />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {TABS.map(({ id, label }) => {
            const locked = id === "launch" && product.sampleStatus !== "VALIDATED";
            return (
              <button
                key={id}
                onClick={() => {
                  if (!locked) {
                    setTab(id);
                    router.replace(`/products/${product.id}?tab=${id}`, { scroll: false });
                  }
                }}
                disabled={locked}
                className={cn(
                  "pb-3 text-sm font-medium border-b-2 transition-colors",
                  tab === id
                    ? "border-purple-700 text-purple-700"
                    : locked
                      ? "border-transparent text-gray-300 cursor-not-allowed"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
              >
                {label}
                {locked && (
                  <span className="ml-1.5 text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">
                    verrou
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {tab === "techpack" && (
          <TechPackTab product={product} />
        )}
        {tab === "sample" && (
          <SampleTab
            product={product}
            sample={product.samples[0] ?? null}
          />
        )}
        {tab === "launch" && product.sampleStatus === "VALIDATED" && (
          <LaunchTab
            product={product}
            allCampaigns={allCampaigns}
          />
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-700",
    VALIDATED: "bg-green-100 text-green-700",
    NOT_VALIDATED: "bg-red-100 text-red-700",
  };
  const labels: Record<string, string> = {
    PENDING: "En attente",
    VALIDATED: "Validé",
    NOT_VALIDATED: "Non validé",
  };
  return (
    <span
      className={`text-sm font-semibold px-3 py-1 rounded-full ${styles[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {labels[status] ?? status}
    </span>
  );
}
