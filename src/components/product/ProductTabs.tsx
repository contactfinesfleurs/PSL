"use client";

import { useState, Fragment } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clipboard, Trash2, Check } from "lucide-react";
import { cn, PRODUCT_FAMILIES, SEASONS, EVENT_TYPES, formatDate } from "@/lib/utils";
import { TechPackTab } from "./TechPackTab";
import { SampleTab } from "./SampleTab";
import { LaunchTab } from "./LaunchTab";

type TimelineStep = {
  id: string;
  label: string;
  sublabel: string;
  done: boolean;
  color: "default" | "green" | "red";
};

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
  plannedLaunchAt: string | null;
  reference: string | null;
  createdAt: string;
  samples: {
    id: string;
    createdAt: string;
    updatedAt: string;
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
    event: { id: string; name: string; type: string; startAt: string; endAt: string | null };
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
  const [deleting, setDeleting] = useState(false);

  const familyLabel =
    PRODUCT_FAMILIES.find((f) => f.value === product.family)?.label ??
    product.family;
  const seasonLabel =
    SEASONS.find((s) => s.value === product.season)?.label ?? product.season;

  function copyToClipboard() {
    navigator.clipboard.writeText(product.sku);
  }

  async function handleDelete() {
    if (!confirm(`Supprimer "${product.name}" ? Cette action est irréversible.`)) return;
    setDeleting(true);
    await fetch(`/api/products/${product.id}`, { method: "DELETE" });
    router.push("/products");
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
            <h1 className="text-2xl font-light text-gray-900">{product.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={copyToClipboard}
                title="Copier la référence SKU"
                className="inline-flex items-center gap-1 text-xs font-mono text-gray-500 hover:text-[#1D1D1F] transition-colors"
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
          <div className="flex items-center gap-2">
            <StatusBadge status={product.sampleStatus} />
            <button
              onClick={handleDelete}
              disabled={deleting}
              title="Supprimer le produit"
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <ProductTimeline product={product} />

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
                    ? "border-[#1D1D1F] text-[#1D1D1F]"
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

function ProductTimeline({ product }: { product: Product }) {
  const steps: TimelineStep[] = [
    {
      id: "created",
      label: "Fiche créée",
      sublabel: formatDate(product.createdAt),
      done: true,
      color: "default",
    },
    {
      id: "techpack",
      label: "Tech pack",
      sublabel: product.techPackPath ? "Ajouté" : "—",
      done: !!product.techPackPath,
      color: "default",
    },
    {
      id: "prototype",
      label: "Prototype",
      sublabel: product.samples[0]
        ? formatDate(product.samples[0].createdAt)
        : "—",
      done: product.samples.length > 0,
      color: "default",
    },
    {
      id: "validation",
      label: "Validation",
      sublabel:
        product.sampleStatus === "VALIDATED"
          ? "Validé"
          : product.sampleStatus === "NOT_VALIDATED"
            ? "Refusé"
            : "En attente",
      done: product.sampleStatus !== "PENDING",
      color:
        product.sampleStatus === "VALIDATED"
          ? "green"
          : product.sampleStatus === "NOT_VALIDATED"
            ? "red"
            : "default",
    },
    {
      id: "launch",
      label: "Lancement",
      sublabel: product.plannedLaunchAt
        ? formatDate(product.plannedLaunchAt)
        : "—",
      done:
        !!product.plannedLaunchAt &&
        new Date(product.plannedLaunchAt) <= new Date(),
      color: "default",
    },
  ];

  // Also show linked events after launch if any
  const linkedEvents = product.events
    .map((ep) => ({
      id: `event-${ep.event.id}`,
      label: ep.event.name,
      sublabel: formatDate(ep.event.startAt),
      done: new Date(ep.event.startAt) < new Date(),
      color: "default" as const,
      typeLabel: EVENT_TYPES.find((t) => t.value === ep.event.type)?.label,
    }))
    .sort((a, b) => new Date(a.sublabel).getTime() - new Date(b.sublabel).getTime());

  const dotStyle = (step: TimelineStep) => {
    if (!step.done) return "bg-white border-gray-200";
    if (step.color === "green") return "bg-green-500 border-green-500";
    if (step.color === "red") return "bg-red-400 border-red-400";
    return "bg-[#1D1D1F] border-[#1D1D1F]";
  };

  const lineStyle = (i: number, arr: TimelineStep[]) =>
    arr[i + 1]?.done ? "bg-[#1D1D1F]" : "bg-gray-200";

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-6 py-4">
      {/* Horizontal stepper: 5 main stages */}
      <div className="flex items-center">
        {steps.map((step, i) => (
          <Fragment key={step.id}>
            <div
              className={cn(
                "h-6 w-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center",
                dotStyle(step)
              )}
            >
              {step.done && <Check className="h-3.5 w-3.5 text-white" />}
            </div>
            {i < steps.length - 1 && (
              <div className={cn("flex-1 h-0.5 min-w-[16px]", lineStyle(i, steps))} />
            )}
          </Fragment>
        ))}
      </div>

      {/* Labels */}
      <div className="flex mt-3">
        {steps.map((step) => (
          <div key={step.id} className="flex-1 text-center">
            <p
              className={cn(
                "text-xs font-medium leading-tight",
                step.done ? "text-gray-700" : "text-gray-400"
              )}
            >
              {step.label}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{step.sublabel}</p>
          </div>
        ))}
      </div>

      {/* Linked events (if any) */}
      {linkedEvents.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
            Événements liés
          </p>
          <div className="flex flex-wrap gap-2">
            {linkedEvents.map((ev) => (
              <span
                key={ev.id}
                className={cn(
                  "inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border",
                  ev.done
                    ? "bg-gray-100 text-gray-600 border-gray-200"
                    : "bg-blue-50 text-blue-700 border-blue-100"
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", ev.done ? "bg-gray-400" : "bg-blue-500")} />
                {ev.label}
                {ev.typeLabel && <span className="text-gray-400">· {ev.typeLabel}</span>}
                <span className="text-gray-400">{ev.sublabel}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
