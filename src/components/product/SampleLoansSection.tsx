"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Check, X } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

type SampleLoan = {
  id: string;
  contactName: string;
  contactRole: string | null;
  publication: string | null;
  purpose: string;
  sentAt: string;
  dueAt: string | null;
  returnedAt: string | null;
  status: string;
  notes: string | null;
};

interface Props {
  productId: string;
  sampleId: string | null;
  initialLoans: SampleLoan[];
}

const PURPOSE_LABELS: Record<string, string> = {
  EDITORIAL: "Éditorial",
  PRESS: "Presse",
  EVENT: "Événement",
  SHOWROOM: "Showroom",
  INFLUENCER: "Influenceur",
  CELEBRITY: "Célébrité",
};

const STATUS_STYLES: Record<string, string> = {
  SENT: "bg-blue-100 text-blue-700",
  RETURNED: "bg-green-100 text-green-700",
  LOST: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  SENT: "En circulation",
  RETURNED: "Retourné",
  LOST: "Perdu",
};

function todayIso(): string {
  return new Date().toISOString().split("T")[0];
}

const defaultForm = {
  contactName: "",
  contactRole: "",
  publication: "",
  purpose: "EDITORIAL",
  sentAt: todayIso(),
  dueAt: "",
  notes: "",
};

export function SampleLoansSection({ productId, sampleId, initialLoans }: Props) {
  const router = useRouter();
  const [loans, setLoans] = useState<SampleLoan[]>(initialLoans);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const totalLoans = loans.length;
  const inCirculation = loans.filter((l) => l.status === "SENT").length;
  const returned = loans.filter((l) => l.status === "RETURNED").length;

  function setField<K extends keyof typeof defaultForm>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sampleId) return;
    setSubmitting(true);

    const body: Record<string, string | null> = {
      contactName: form.contactName,
      contactRole: form.contactRole || null,
      publication: form.publication || null,
      purpose: form.purpose,
      sentAt: new Date(form.sentAt).toISOString(),
      dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null,
      notes: form.notes || null,
    };

    const res = await fetch(`/api/products/${productId}/loans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const created = (await res.json()) as SampleLoan;
      setLoans((prev) => [created, ...prev]);
      setForm({ ...defaultForm, sentAt: todayIso() });
      setShowForm(false);
    }

    setSubmitting(false);
    router.refresh();
  }

  async function updateStatus(
    loanId: string,
    status: "RETURNED" | "LOST"
  ) {
    setActionLoading(loanId + status);

    const body: Record<string, string> = { status };
    if (status === "RETURNED") {
      body.returnedAt = new Date().toISOString();
    }

    const res = await fetch(`/api/loans/${loanId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const updated = (await res.json()) as SampleLoan;
      setLoans((prev) =>
        prev.map((l) => (l.id === loanId ? updated : l))
      );
    }

    setActionLoading(null);
    router.refresh();
  }

  function isDueOverdue(loan: SampleLoan): boolean {
    if (!loan.dueAt || loan.status !== "SENT") return false;
    return new Date(loan.dueAt) < new Date();
  }

  if (!sampleId) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-1">Prêts presse</h2>
        <div className="mt-4 flex items-center gap-3 rounded-lg bg-gray-50 border border-dashed border-gray-300 px-4 py-8 justify-center">
          <p className="text-sm text-gray-400">
            Créez d&apos;abord un prototype pour activer les prêts
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h2 className="text-base font-semibold text-gray-800">Prêts presse</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {totalLoans} prêt{totalLoans !== 1 ? "s" : ""} ·{" "}
            <span className="text-blue-600">{inCirculation} en circulation</span> ·{" "}
            <span className="text-green-600">{returned} retourné{returned !== 1 ? "s" : ""}</span>
          </p>
        </div>
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
          {showForm ? "Annuler" : "Nouveau prêt"}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="px-5 py-4 border-b border-gray-100 bg-gray-50 space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Nom du contact <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.contactName}
                onChange={(e) => setField("contactName", e.target.value)}
                placeholder="Marie Dupont"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Fonction
              </label>
              <input
                type="text"
                value={form.contactRole}
                onChange={(e) => setField("contactRole", e.target.value)}
                placeholder="Rédactrice mode"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Publication
              </label>
              <input
                type="text"
                value={form.publication}
                onChange={(e) => setField("publication", e.target.value)}
                placeholder="Vogue, Elle, WWD..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Objet <span className="text-red-500">*</span>
              </label>
              <select
                value={form.purpose}
                onChange={(e) => setField("purpose", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
              >
                {Object.entries(PURPOSE_LABELS).map(([val, label]) => (
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
                Date d&apos;envoi <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={form.sentAt}
                onChange={(e) => setField("sentAt", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Date de retour prévue
              </label>
              <input
                type="date"
                value={form.dueAt}
                onChange={(e) => setField("dueAt", e.target.value)}
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
              {submitting ? "Enregistrement…" : "Enregistrer le prêt"}
            </button>
          </div>
        </form>
      )}

      {/* Loans list */}
      <div className="divide-y divide-gray-100">
        {loans.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-gray-400">Aucun prêt enregistré</p>
          </div>
        ) : (
          loans.map((loan) => {
            const overdue = isDueOverdue(loan);
            return (
              <div key={loan.id} className="px-5 py-4 flex items-start gap-4">
                <div className="flex-1 min-w-0 space-y-1">
                  {/* Contact line */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {loan.contactName}
                    </span>
                    {loan.contactRole && (
                      <span className="text-xs text-gray-500">{loan.contactRole}</span>
                    )}
                    {loan.publication && (
                      <span className="text-xs text-gray-400">— {loan.publication}</span>
                    )}
                  </div>

                  {/* Badges + dates */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                      {PURPOSE_LABELS[loan.purpose] ?? loan.purpose}
                    </span>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full font-medium",
                        STATUS_STYLES[loan.status] ?? "bg-gray-100 text-gray-600"
                      )}
                    >
                      {STATUS_LABELS[loan.status] ?? loan.status}
                    </span>

                    <span className="text-gray-500">
                      Envoyé le {formatDate(loan.sentAt)}
                    </span>

                    {loan.dueAt && (
                      <span className={cn(overdue ? "text-red-600 font-semibold" : "text-gray-500")}>
                        · Retour prévu {formatDate(loan.dueAt)}
                        {overdue && " (en retard)"}
                      </span>
                    )}

                    {loan.returnedAt && (
                      <span className="text-gray-500">
                        · Retourné le {formatDate(loan.returnedAt)}
                      </span>
                    )}
                  </div>

                  {loan.notes && (
                    <p className="text-xs text-gray-400 italic">{loan.notes}</p>
                  )}
                </div>

                {/* Actions for SENT loans */}
                {loan.status === "SENT" && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => updateStatus(loan.id, "RETURNED")}
                      disabled={actionLoading === loan.id + "RETURNED"}
                      title="Marquer comme retourné"
                      className="inline-flex items-center gap-1 text-xs font-medium bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Retourné
                    </button>
                    <button
                      onClick={() => updateStatus(loan.id, "LOST")}
                      disabled={actionLoading === loan.id + "LOST"}
                      title="Marquer comme perdu"
                      className="inline-flex items-center gap-1 text-xs font-medium bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" />
                      Perdu
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
