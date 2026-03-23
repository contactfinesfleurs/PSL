"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Clipboard, Lock } from "lucide-react";
import { cn, PRODUCT_FAMILIES, SEASONS } from "@/lib/utils";
import { TechPackTab } from "./TechPackTab";
import { SampleTab } from "./SampleTab";
import { LaunchTab } from "./LaunchTab";
import { SampleLoansSection } from "./SampleLoansSection";
import { MediaPlacementsSection } from "./MediaPlacementsSection";

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
  variantGroupId: string | null;
  samples: {
    id: string;
    samplePhotoPaths: string | null;
    detailPhotoPaths: string | null;
    reviewPhotoPaths: string | null;
    reviewNotes: string | null;
    packshotPaths: string | null;
    definitiveColors: string | null;
    definitiveMaterials: string | null;
    supplierName: string | null;
    supplierAddress: string | null;
    supplierCountry: string | null;
    shippingDate: Date | null;
    trackingNumber: string | null;
    trackingStatus: string | null;
    receivedAt: Date | null;
  }[];
  loans: {
    id: string;
    contactName: string;
    contactRole: string | null;
    publication: string | null;
    purpose: string;
    sentAt: Date;
    dueAt: Date | null;
    returnedAt: Date | null;
    status: string;
    notes: string | null;
  }[];
  placements: {
    id: string;
    publication: string;
    type: string;
    publishedAt: Date;
    url: string | null;
    reach: number | null;
    notes: string | null;
  }[];
  campaigns: {
    campaign: { id: string; name: string; type: string; status: string };
  }[];
  events: {
    event: { id: string; name: string; type: string; startAt: Date };
  }[];
};

type StepId = "techpack" | "sample" | "presse" | "launch";
type StepState = "completed" | "active" | "available" | "locked";

function buildSteps(product: Product, activeTab: string) {
  const hasSample = product.samples.length > 0;
  const isValidated = product.sampleStatus === "VALIDATED";
  const presseCount = product.loans.length + product.placements.length;

  const steps: { id: StepId; label: string; sublabel: string; state: StepState }[] = [
    {
      id: "techpack",
      label: "Tech Pack",
      sublabel: product.techPackPath ? "Fichier joint" : "À compléter",
      state:
        activeTab === "techpack"
          ? "active"
          : product.techPackPath
            ? "completed"
            : "available",
    },
    {
      id: "sample",
      label: "Prototype",
      sublabel: isValidated ? "Validé" : hasSample ? "En cours" : "À créer",
      state:
        activeTab === "sample"
          ? "active"
          : isValidated
            ? "completed"
            : "available",
    },
    {
      id: "presse",
      label: "Presse",
      sublabel: !hasSample
        ? "Prototype requis"
        : presseCount > 0
          ? `${presseCount} entrée${presseCount > 1 ? "s" : ""}`
          : "Prêts & retombées",
      state: !hasSample
        ? "locked"
        : activeTab === "presse"
          ? "active"
          : presseCount > 0
            ? "completed"
            : "available",
    },
    {
      id: "launch",
      label: "Lancement",
      sublabel: !isValidated
        ? "Validation requise"
        : product.campaigns.length > 0
          ? `${product.campaigns.length} campagne${product.campaigns.length > 1 ? "s" : ""}`
          : "À planifier",
      state: !isValidated
        ? "locked"
        : activeTab === "launch"
          ? "active"
          : product.campaigns.length > 0
            ? "completed"
            : "available",
    },
  ];

  return steps;
}

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
  // Redirect legacy "loans"/"placements" tab params to "presse"
  const resolvedTab = (activeTab === "loans" || activeTab === "placements") ? "presse" : activeTab;
  const [tab, setTab] = useState<StepId>((resolvedTab as StepId) || "techpack");

  const familyLabel =
    PRODUCT_FAMILIES.find((f) => f.value === product.family)?.label ?? product.family;
  const seasonLabel =
    SEASONS.find((s) => s.value === product.season)?.label ?? product.season;

  function copyToClipboard() {
    navigator.clipboard.writeText(product.sku);
  }

  function navigate(id: StepId, state: StepState) {
    if (state === "locked") return;
    setTab(id);
    router.replace(`/products/${product.id}?tab=${id}`, { scroll: false });
  }

  const steps = buildSteps(product, tab);

  return (
    <div className="space-y-8">
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
            <h1 className="text-2xl font-light text-gray-900">{product.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={copyToClipboard}
                title="Copier la référence"
                className="inline-flex items-center gap-1 text-xs font-mono text-gray-500 hover:text-gray-900 transition-colors"
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

      {/* Stepper */}
      <div className="relative">
        {/* Connecting line */}
        <div className="absolute top-5 left-0 right-0 flex" aria-hidden>
          {steps.slice(0, -1).map((step, i) => {
            const next = steps[i + 1];
            const filled =
              step.state === "completed" && next.state !== "locked";
            return (
              <div key={step.id} className="flex-1 flex items-center px-8">
                <div
                  className={cn(
                    "h-px w-full transition-colors duration-300",
                    filled ? "bg-gray-800" : "bg-gray-200"
                  )}
                />
              </div>
            );
          })}
        </div>

        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const isActive = step.state === "active";
            const isDone = step.state === "completed";
            const isLocked = step.state === "locked";

            return (
              <button
                key={step.id}
                onClick={() => navigate(step.id, step.state)}
                disabled={isLocked}
                className={cn(
                  "flex flex-col items-center gap-2 group",
                  isLocked ? "cursor-not-allowed" : "cursor-pointer"
                )}
              >
                {/* Circle */}
                <div
                  className={cn(
                    "relative z-10 h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all duration-200",
                    isActive &&
                      "bg-gray-900 border-gray-900 shadow-sm ring-4 ring-gray-900/10",
                    isDone && "bg-gray-900 border-gray-900",
                    !isActive &&
                      !isDone &&
                      !isLocked &&
                      "bg-white border-gray-300 group-hover:border-gray-500",
                    isLocked && "bg-gray-50 border-gray-200"
                  )}
                >
                  {isDone && !isActive && (
                    <Check className="h-4 w-4 text-white" strokeWidth={2.5} />
                  )}
                  {isActive && (
                    <span className="text-sm font-semibold text-white">
                      {index + 1}
                    </span>
                  )}
                  {!isDone && !isActive && !isLocked && (
                    <span className="text-sm font-medium text-gray-400 group-hover:text-gray-600">
                      {index + 1}
                    </span>
                  )}
                  {isLocked && (
                    <Lock className="h-3.5 w-3.5 text-gray-300" />
                  )}
                </div>

                {/* Labels */}
                <div className="flex flex-col items-center gap-0.5 text-center min-w-[80px]">
                  <span
                    className={cn(
                      "text-xs font-semibold leading-tight transition-colors",
                      isActive && "text-gray-900",
                      isDone && "text-gray-700",
                      !isActive && !isDone && !isLocked && "text-gray-500 group-hover:text-gray-700",
                      isLocked && "text-gray-300"
                    )}
                  >
                    {step.label}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] leading-tight",
                      isLocked ? "text-gray-300" : "text-gray-400"
                    )}
                  >
                    {step.sublabel}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="pt-2">
        {tab === "techpack" && <TechPackTab product={product} />}
        {tab === "sample" && (
          <SampleTab product={product} sample={product.samples[0] ?? null} />
        )}
        {tab === "presse" && (
          <div className="space-y-10">
            <SampleLoansSection
              productId={product.id}
              sampleId={product.samples[0]?.id ?? null}
              initialLoans={product.loans.map((l) => ({
                ...l,
                sentAt: l.sentAt.toISOString(),
                dueAt: l.dueAt?.toISOString() ?? null,
                returnedAt: l.returnedAt?.toISOString() ?? null,
              }))}
            />
            <div className="border-t border-gray-100 pt-10">
              <MediaPlacementsSection
                productId={product.id}
                initialPlacements={product.placements.map((p) => ({
                  ...p,
                  publishedAt: p.publishedAt.toISOString(),
                }))}
              />
            </div>
          </div>
        )}
        {tab === "launch" && product.sampleStatus === "VALIDATED" && (
          <LaunchTab product={product} allCampaigns={allCampaigns} />
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
