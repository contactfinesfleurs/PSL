import { cn } from "@/lib/utils";

// ─── Status colour map ────────────────────────────────────────────────────
// Covers product sample status, event status and campaign status in one place.

const STATUS_STYLES: Record<string, string> = {
  // Product sample status
  PENDING: "bg-yellow-100 text-yellow-700",
  VALIDATED: "bg-green-100 text-green-700",
  NOT_VALIDATED: "bg-red-100 text-red-700",

  // Event / Campaign shared
  DRAFT: "bg-gray-100 text-gray-600",
  CONFIRMED: "bg-blue-100 text-blue-700",
  ACTIVE: "bg-blue-100 text-blue-700",
  PAUSED: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  VALIDATED: "Validé",
  NOT_VALIDATED: "Non validé",
  DRAFT: "Brouillon",
  CONFIRMED: "Confirmé",
  ACTIVE: "Actif",
  PAUSED: "En pause",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
};

interface BadgeProps {
  status: string;
  className?: string;
}

export function Badge({ status, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "text-xs font-medium px-2 py-0.5 rounded-full",
        STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600",
        className
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
