import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';
import { CAMPAIGN_TYPES, formatDate } from "@/lib/utils";
import { Plus, Megaphone } from "lucide-react";

export default async function CampaignsPage() {
  const campaigns = await prisma.campaign.findMany({
    include: { products: true, event: true },
    orderBy: { createdAt: "desc" },
  });

  const typeLabel = (t: string) => CAMPAIGN_TYPES.find((c) => c.value === t)?.label ?? t;

  const statusMap: Record<string, { label: string; color: string; bg: string }> = {
    DRAFT:     { label: "Brouillon", color: "#6E6E73", bg: "rgba(0,0,0,0.06)"       },
    ACTIVE:    { label: "Active",    color: "#1E40AF", bg: "rgba(59,130,246,0.12)"  },
    PAUSED:    { label: "En pause",  color: "#92400E", bg: "rgba(245,158,11,0.12)"  },
    COMPLETED: { label: "Terminée",  color: "#166534", bg: "rgba(34,197,94,0.12)"   },
    CANCELLED: { label: "Annulée",   color: "#991B1B", bg: "rgba(239,68,68,0.12)"   },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "36px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <h1>Campagnes</h1>
          <p style={{ marginTop: "6px", fontSize: "13px", color: "#8E8E93", fontWeight: 300 }}>
            {campaigns.length} campagne{campaigns.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/campaigns/new"
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: "#1D1D1F", color: "#fff", fontSize: "12.5px", fontWeight: 400, padding: "8px 16px", borderRadius: "980px", letterSpacing: "-0.01em" }}
        >
          <Plus strokeWidth={1.75} style={{ width: 13, height: 13 }} />
          Nouvelle campagne
        </Link>
      </div>

      {/* Grid */}
      {campaigns.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px", backgroundColor: "#fff", borderRadius: "16px", border: "1px solid rgba(0,0,0,0.07)" }}>
          <Megaphone strokeWidth={1} style={{ width: 40, height: 40, color: "#C7C7CC", margin: "0 auto 16px" }} />
          <p style={{ color: "#8E8E93", fontSize: "13px", fontWeight: 300 }}>Aucune campagne</p>
          <Link href="/campaigns/new" style={{ display: "inline-flex", alignItems: "center", gap: "5px", marginTop: "14px", fontSize: "12.5px", color: "#1D1D1F", fontWeight: 400 }}>
            <Plus strokeWidth={1.5} style={{ width: 12, height: 12 }} />
            Créer une campagne
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
          {campaigns.map((campaign) => {
            const s = statusMap[campaign.status] ?? { label: campaign.status, color: "#6E6E73", bg: "rgba(0,0,0,0.06)" };
            return (
              <Link
                key={campaign.id}
                href={`/campaigns/${campaign.id}`}
                className="apple-card card-hover"
                style={{ display: "block", padding: "18px", transition: "box-shadow 0.15s" }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                  <p style={{ fontSize: "13px", fontWeight: 400, color: "#1D1D1F", letterSpacing: "-0.015em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {campaign.name}
                  </p>
                  <span style={{ flexShrink: 0, fontSize: "10.5px", fontWeight: 300, padding: "2px 9px", borderRadius: "20px", backgroundColor: s.bg, color: s.color }}>
                    {s.label}
                  </span>
                </div>

                <p style={{ fontSize: "11px", color: "#8E8E93", fontWeight: 300, marginTop: "4px" }}>
                  {typeLabel(campaign.type)}
                </p>

                {(campaign.startAt || campaign.endAt) && (
                  <p style={{ fontSize: "11px", color: "#8E8E93", fontWeight: 300, marginTop: "8px" }}>
                    {campaign.startAt ? formatDate(campaign.startAt) : "?"}
                    {campaign.endAt ? ` → ${formatDate(campaign.endAt)}` : ""}
                  </p>
                )}

                <div style={{ marginTop: "14px", display: "flex", gap: "12px" }}>
                  <span style={{ fontSize: "11px", color: "#8E8E93", fontWeight: 300 }}>{campaign.products.length} produit{campaign.products.length !== 1 ? "s" : ""}</span>
                  {campaign.event && <span style={{ fontSize: "11px", color: "#8E8E93", fontWeight: 300 }}>· {campaign.event.name}</span>}
                  {campaign.budget && (
                    <span style={{ fontSize: "11px", color: "#8E8E93", fontWeight: 300 }}>
                      · {new Intl.NumberFormat("fr-FR", { style: "currency", currency: campaign.currency ?? "EUR", maximumFractionDigits: 0 }).format(campaign.budget)}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
