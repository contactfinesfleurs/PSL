import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';
import { EVENT_TYPES, formatDate } from "@/lib/utils";
import { Plus, Calendar } from "lucide-react";

export default async function EventsPage() {
  const events = await prisma.event.findMany({
    include: { products: true, campaigns: true },
    orderBy: { startAt: "asc" },
  });

  const typeLabel = (t: string) => EVENT_TYPES.find((e) => e.value === t)?.label ?? t;

  const statusMap: Record<string, { label: string; color: string; bg: string }> = {
    DRAFT:     { label: "Brouillon", color: "#6E6E73", bg: "rgba(0,0,0,0.06)"      },
    CONFIRMED: { label: "Confirmé",  color: "#1E40AF", bg: "rgba(59,130,246,0.12)" },
    COMPLETED: { label: "Terminé",   color: "#166534", bg: "rgba(34,197,94,0.12)"  },
    CANCELLED: { label: "Annulé",    color: "#991B1B", bg: "rgba(239,68,68,0.12)"  },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "36px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <h1>Événements</h1>
          <p style={{ marginTop: "6px", fontSize: "13px", color: "#8E8E93", fontWeight: 300 }}>
            {events.length} événement{events.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/events/new"
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: "#1D1D1F", color: "#fff", fontSize: "12.5px", fontWeight: 400, padding: "8px 16px", borderRadius: "980px", letterSpacing: "-0.01em" }}
        >
          <Plus strokeWidth={1.75} style={{ width: 13, height: 13 }} />
          Nouvel événement
        </Link>
      </div>

      {/* List */}
      {events.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px", backgroundColor: "#fff", borderRadius: "16px", border: "1px solid rgba(0,0,0,0.07)" }}>
          <Calendar strokeWidth={1} style={{ width: 40, height: 40, color: "#C7C7CC", margin: "0 auto 16px" }} />
          <p style={{ color: "#8E8E93", fontSize: "13px", fontWeight: 300 }}>Aucun événement</p>
          <Link href="/events/new" style={{ display: "inline-flex", alignItems: "center", gap: "5px", marginTop: "14px", fontSize: "12.5px", color: "#1D1D1F", fontWeight: 400 }}>
            <Plus strokeWidth={1.5} style={{ width: 12, height: 12 }} />
            Créer un événement
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {events.map((event) => {
            const s = statusMap[event.status] ?? { label: event.status, color: "#6E6E73", bg: "rgba(0,0,0,0.06)" };
            return (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="apple-card row-hover card-hover"
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", transition: "box-shadow 0.15s" }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <p style={{ fontSize: "13px", fontWeight: 400, color: "#1D1D1F", letterSpacing: "-0.015em" }}>{event.name}</p>
                    <span style={{ fontSize: "10.5px", fontWeight: 300, padding: "2px 9px", borderRadius: "20px", backgroundColor: s.bg, color: s.color, whiteSpace: "nowrap" }}>
                      {s.label}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
                    <span style={{ fontSize: "11px", color: "#8E8E93", fontWeight: 300, display: "flex", alignItems: "center", gap: "4px" }}>
                      <Calendar strokeWidth={1.5} style={{ width: 11, height: 11 }} />
                      {formatDate(event.startAt)}{event.endAt ? ` → ${formatDate(event.endAt)}` : ""}
                    </span>
                    {event.location && <span style={{ fontSize: "11px", color: "#8E8E93", fontWeight: 300 }}>· {event.location}</span>}
                    <span style={{ fontSize: "10.5px", fontWeight: 300, padding: "1px 7px", borderRadius: "5px", backgroundColor: "rgba(0,0,0,0.05)", color: "#636366" }}>
                      {typeLabel(event.type)}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "16px", marginLeft: "16px", flexShrink: 0 }}>
                  <span style={{ fontSize: "11px", color: "#8E8E93", fontWeight: 300 }}>{event.products.length} produit{event.products.length !== 1 ? "s" : ""}</span>
                  <span style={{ fontSize: "11px", color: "#8E8E93", fontWeight: 300 }}>{event.campaigns.length} campagne{event.campaigns.length !== 1 ? "s" : ""}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
