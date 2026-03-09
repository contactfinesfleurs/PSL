"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Check, Download, Users } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

type EventGuest = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  company: string | null;
  title: string | null;
  category: string;
  rsvpStatus: string;
  checkedIn: boolean;
  checkedInAt: string | null;
  tableNumber: string | null;
  seatNumber: string | null;
  notes: string | null;
};

interface Props {
  eventId: string;
  initialGuests: EventGuest[];
}

const CATEGORY_LABELS: Record<string, string> = {
  VIP: "VIP",
  PRESS: "Presse",
  BUYER: "Acheteur",
  INFLUENCER: "Influenceur",
  INDUSTRY: "Industrie",
  GUEST: "Invité",
};

const CATEGORY_STYLES: Record<string, string> = {
  VIP: "bg-purple-100 text-purple-700",
  PRESS: "bg-blue-100 text-blue-700",
  BUYER: "bg-green-100 text-green-700",
  INFLUENCER: "bg-pink-100 text-pink-700",
  INDUSTRY: "bg-gray-100 text-gray-600",
  GUEST: "bg-gray-100 text-gray-500",
};

const RSVP_LABELS: Record<string, string> = {
  INVITED: "Invité",
  CONFIRMED: "Confirmé",
  DECLINED: "Décliné",
  WAITLIST: "Liste d'attente",
};

const RSVP_STYLES: Record<string, string> = {
  INVITED: "bg-gray-100 text-gray-600",
  CONFIRMED: "bg-green-100 text-green-700",
  DECLINED: "bg-red-100 text-red-700",
  WAITLIST: "bg-yellow-100 text-yellow-700",
};

type FilterTab = "all" | "CONFIRMED" | "DECLINED" | "INVITED";

const defaultForm = {
  firstName: "",
  lastName: "",
  email: "",
  company: "",
  title: "",
  category: "GUEST",
  rsvpStatus: "INVITED",
  tableNumber: "",
  seatNumber: "",
  notes: "",
};

function escapeCsvCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function EventGuestSection({ eventId, initialGuests }: Props) {
  const router = useRouter();
  const [guests, setGuests] = useState<EventGuest[]>(initialGuests);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [rsvpLoading, setRsvpLoading] = useState<string | null>(null);
  const [checkInLoading, setCheckInLoading] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");

  const totalInvited = guests.length;
  const totalConfirmed = guests.filter((g) => g.rsvpStatus === "CONFIRMED").length;
  const totalDeclined = guests.filter((g) => g.rsvpStatus === "DECLINED").length;
  const totalPresent = guests.filter((g) => g.checkedIn).length;

  const filteredGuests = guests.filter((g) => {
    if (filterTab === "all") return true;
    if (filterTab === "CONFIRMED") return g.rsvpStatus === "CONFIRMED";
    if (filterTab === "DECLINED") return g.rsvpStatus === "DECLINED";
    if (filterTab === "INVITED") return g.rsvpStatus === "INVITED" || g.rsvpStatus === "WAITLIST";
    return true;
  });

  function setField<K extends keyof typeof defaultForm>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const body: Record<string, string | null> = {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email || null,
      company: form.company || null,
      title: form.title || null,
      category: form.category,
      rsvpStatus: form.rsvpStatus,
      tableNumber: form.tableNumber || null,
      seatNumber: form.seatNumber || null,
      notes: form.notes || null,
    };

    const res = await fetch(`/api/events/${eventId}/guests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const created = (await res.json()) as EventGuest;
      setGuests((prev) => [...prev, created]);
      setForm(defaultForm);
      setShowForm(false);
    }

    setSubmitting(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    setDeleting(id);

    const res = await fetch(`/api/guests/${id}`, { method: "DELETE" });

    if (res.ok) {
      setGuests((prev) => prev.filter((g) => g.id !== id));
    }

    setDeleting(null);
    router.refresh();
  }

  async function handleRsvpChange(id: string, rsvpStatus: string) {
    setRsvpLoading(id);

    const res = await fetch(`/api/guests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rsvpStatus }),
    });

    if (res.ok) {
      const updated = (await res.json()) as EventGuest;
      setGuests((prev) => prev.map((g) => (g.id === id ? updated : g)));
    }

    setRsvpLoading(null);
    router.refresh();
  }

  async function handleCheckIn(guest: EventGuest) {
    setCheckInLoading(guest.id);

    const newCheckedIn = !guest.checkedIn;
    const body: Record<string, boolean | string> = { checkedIn: newCheckedIn };
    if (newCheckedIn) {
      body.checkedInAt = new Date().toISOString();
    }

    const res = await fetch(`/api/guests/${guest.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const updated = (await res.json()) as EventGuest;
      setGuests((prev) => prev.map((g) => (g.id === guest.id ? updated : g)));
    }

    setCheckInLoading(null);
    router.refresh();
  }

  function handleExportCsv() {
    const headers = ["Prénom", "Nom", "Société", "Titre", "Catégorie", "RSVP", "Présent", "Table", "Siège"];
    const rows = guests.map((g) => [
      g.firstName,
      g.lastName,
      g.company ?? "",
      g.title ?? "",
      CATEGORY_LABELS[g.category] ?? g.category,
      RSVP_LABELS[g.rsvpStatus] ?? g.rsvpStatus,
      g.checkedIn ? "Oui" : "Non",
      g.tableNumber ?? "",
      g.seatNumber ?? "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map(escapeCsvCell).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `invités-evenement-${eventId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "Tous" },
    { key: "CONFIRMED", label: "Confirmés" },
    { key: "DECLINED", label: "Déclinés" },
    { key: "INVITED", label: "En attente" },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <Users className="h-4 w-4 text-purple-700" />
            Liste des invités
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {totalInvited} invité{totalInvited !== 1 ? "s" : ""} ·{" "}
            <span className="text-green-600">{totalConfirmed} confirmé{totalConfirmed !== 1 ? "s" : ""}</span> ·{" "}
            <span className="text-red-500">{totalDeclined} décliné{totalDeclined !== 1 ? "s" : ""}</span> ·{" "}
            <span className="text-purple-600">{totalPresent} présent{totalPresent !== 1 ? "s" : ""}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            title="Exporter en CSV"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            onClick={() => setShowForm((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors",
              showForm
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                : "bg-purple-700 hover:bg-purple-800 text-white"
            )}
          >
            <Plus className="h-4 w-4" />
            {showForm ? "Annuler" : "Ajouter"}
          </button>
        </div>
      </div>

      {/* Add guest form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="px-5 py-4 border-b border-gray-100 bg-gray-50 space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Prénom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.firstName}
                onChange={(e) => setField("firstName", e.target.value)}
                placeholder="Marie"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.lastName}
                onChange={(e) => setField("lastName", e.target.value)}
                placeholder="Dupont"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              placeholder="marie.dupont@exemple.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Société
              </label>
              <input
                type="text"
                value={form.company}
                onChange={(e) => setField("company", e.target.value)}
                placeholder="Vogue France"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Titre
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                placeholder="Rédactrice en chef"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Catégorie <span className="text-red-500">*</span>
              </label>
              <select
                value={form.category}
                onChange={(e) => setField("category", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
              >
                {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Statut RSVP
              </label>
              <select
                value={form.rsvpStatus}
                onChange={(e) => setField("rsvpStatus", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
              >
                {Object.entries(RSVP_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Table
              </label>
              <input
                type="text"
                value={form.tableNumber}
                onChange={(e) => setField("tableNumber", e.target.value)}
                placeholder="T1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Siège
              </label>
              <input
                type="text"
                value={form.seatNumber}
                onChange={(e) => setField("seatNumber", e.target.value)}
                placeholder="A3"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              rows={2}
              placeholder="Informations complémentaires…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              {submitting ? "Enregistrement…" : "Ajouter l'invité"}
            </button>
          </div>
        </form>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1 px-5 py-2 border-b border-gray-100 overflow-x-auto">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterTab(tab.key)}
            className={cn(
              "shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors",
              filterTab === tab.key
                ? "bg-purple-700 text-white"
                : "text-gray-500 hover:bg-gray-100"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Guest list */}
      <div className="divide-y divide-gray-100">
        {filteredGuests.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-gray-400">Aucun invité dans cette catégorie</p>
          </div>
        ) : (
          filteredGuests.map((guest) => (
            <div key={guest.id} className="px-5 py-3 flex items-center gap-3">
              {/* Guest info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {guest.firstName} {guest.lastName}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full",
                      CATEGORY_STYLES[guest.category] ?? "bg-gray-100 text-gray-600"
                    )}
                  >
                    {CATEGORY_LABELS[guest.category] ?? guest.category}
                  </span>
                </div>
                {(guest.company || guest.title) && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {[guest.title, guest.company].filter(Boolean).join(" · ")}
                  </p>
                )}
                {(guest.tableNumber || guest.seatNumber) && (
                  <p className="text-xs text-gray-400">
                    {guest.tableNumber && `Table ${guest.tableNumber}`}
                    {guest.tableNumber && guest.seatNumber && " · "}
                    {guest.seatNumber && `Siège ${guest.seatNumber}`}
                  </p>
                )}
              </div>

              {/* RSVP select */}
              <select
                value={guest.rsvpStatus}
                disabled={rsvpLoading === guest.id}
                onChange={(e) => handleRsvpChange(guest.id, e.target.value)}
                className={cn(
                  "shrink-0 text-xs font-medium px-2 py-1 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-400 transition-colors disabled:opacity-50",
                  RSVP_STYLES[guest.rsvpStatus] ?? "bg-gray-100 text-gray-600",
                  "border-transparent"
                )}
              >
                {Object.entries(RSVP_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>

              {/* Check-in button */}
              {guest.checkedIn ? (
                <button
                  onClick={() => handleCheckIn(guest)}
                  disabled={checkInLoading === guest.id}
                  title={guest.checkedInAt ? `Présent à ${formatDate(guest.checkedInAt)}` : "Présent"}
                  className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  <Check className="h-3.5 w-3.5" />
                  Présent
                  {guest.checkedInAt && (
                    <span className="text-green-500 font-normal">
                      {new Date(guest.checkedInAt).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => handleCheckIn(guest)}
                  disabled={checkInLoading === guest.id}
                  className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  Check-in
                </button>
              )}

              {/* Delete */}
              <button
                onClick={() => handleDelete(guest.id)}
                disabled={deleting === guest.id}
                className="shrink-0 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50"
                title="Supprimer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
