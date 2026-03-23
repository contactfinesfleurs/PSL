"use client";

import { useEffect, useState } from "react";
import { Mail, Check, X } from "lucide-react";

type Invitation = {
  id: string;
  createdAt: string;
  invitedByProfile: { name: string };
  project: { id: string; name: string; code: string };
};

export function PendingInvitations() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [acting, setActing] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/projects/invitations");
    if (res.ok) {
      const data = await res.json();
      setInvitations(Array.isArray(data) ? data : []);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function respond(id: string, action: "accept" | "decline") {
    setActing(id);
    const res = await fetch(`/api/projects/invitations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      setInvitations((prev) => prev.filter((inv) => inv.id !== id));
      // Refresh the page so newly joined project appears
      if (action === "accept") {
        window.location.reload();
      }
    }
    setActing(null);
  }

  if (invitations.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-2">
        <Mail className="h-3.5 w-3.5" />
        Invitations en attente ({invitations.length})
      </h2>
      <div className="space-y-2">
        {invitations.map((inv) => (
          <div
            key={inv.id}
            className="flex items-center justify-between gap-4 bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-4"
          >
            <div>
              <p className="text-sm font-medium text-gray-900">
                {inv.project.name}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Invité par{" "}
                <strong className="text-gray-700">
                  {inv.invitedByProfile.name}
                </strong>
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => respond(inv.id, "accept")}
                disabled={acting === inv.id}
                className="inline-flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              >
                <Check className="h-3.5 w-3.5" />
                Accepter
              </button>
              <button
                onClick={() => respond(inv.id, "decline")}
                disabled={acting === inv.id}
                className="inline-flex items-center gap-1.5 border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                Refuser
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
