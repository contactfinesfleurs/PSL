"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";

type TeamRow = {
  id: string;
  name: string;
  description: string | null;
  _count: { members: number };
};

type Props = {
  actingRole: string;
};

export function TeamsTab({ actingRole }: Props) {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });

  const isSuperAdmin = actingRole === "SUPER_ADMIN";

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/teams");
      if (res.ok) setTeams(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, description: form.description || null }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Erreur lors de la création.");
        return;
      }
      setForm({ name: "", description: "" });
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Supprimer l'équipe "${name}" ? Les membres ne seront pas supprimés.`)) return;
    const res = await fetch(`/api/admin/teams/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Erreur lors de la suppression.");
    }
    load();
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{teams.length} équipe{teams.length !== 1 ? "s" : ""}</p>
        {isSuperAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Nouvelle équipe
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Créer une équipe</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          {error && (
            <p className="text-sm text-red-600 mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
          <form onSubmit={handleCreate} className="space-y-3">
            <input
              required
              placeholder="Nom de l'équipe"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              placeholder="Description (optionnel)"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? "Création…" : "Créer"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {loading ? (
        <p className="text-sm text-gray-400 py-8 text-center">Chargement…</p>
      ) : teams.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">Aucune équipe</p>
      ) : (
        <div className="grid gap-3">
          {teams.map((team) => (
            <div key={team.id} className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 text-sm">{team.name}</p>
                {team.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{team.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {team._count.members} membre{team._count.members !== 1 ? "s" : ""}
                </p>
              </div>
              {isSuperAdmin && (
                <button
                  onClick={() => handleDelete(team.id, team.name)}
                  className="text-gray-300 hover:text-red-500 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
