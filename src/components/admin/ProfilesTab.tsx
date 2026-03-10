"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ProfileRow = {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  role: string;
  teamId: string | null;
  team: { id: string; name: string } | null;
};

type Team = { id: string; name: string };

type Props = {
  actingRole: string;
  actingTeamId: string | null;
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super-admin",
  ADMIN: "Admin",
  MEMBER: "Membre",
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-indigo-100 text-indigo-700",
  ADMIN: "bg-blue-100 text-blue-700",
  MEMBER: "bg-gray-100 text-gray-600",
};

export function ProfilesTab({ actingRole, actingTeamId }: Props) {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "MEMBER",
    teamId: "",
  });

  const isSuperAdmin = actingRole === "SUPER_ADMIN";

  async function load() {
    setLoading(true);
    try {
      const [pRes, tRes] = await Promise.all([
        fetch("/api/admin/profiles"),
        fetch("/api/admin/teams"),
      ]);
      if (pRes.ok) setProfiles(await pRes.json());
      if (tRes.ok) setTeams(await tRes.json());
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
      const res = await fetch("/api/admin/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          teamId: form.teamId || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Erreur lors de la création.");
        return;
      }
      setForm({ name: "", email: "", password: "", role: "MEMBER", teamId: "" });
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleRoleChange(profileId: string, role: string) {
    const res = await fetch(`/api/admin/profiles/${profileId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Erreur lors de la mise à jour du rôle.");
    }
    load();
  }

  async function handleTeamChange(profileId: string, teamId: string) {
    const res = await fetch(`/api/admin/profiles/${profileId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId: teamId || null }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Erreur lors de la mise à jour de l'équipe.");
    }
    load();
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{profiles.length} profil{profiles.length !== 1 ? "s" : ""}</p>
        {isSuperAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Nouveau profil
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Créer un profil</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          {error && (
            <p className="text-sm text-red-600 mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3">
            <input
              required
              placeholder="Nom"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              required
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              required
              type="password"
              placeholder="Mot de passe (min. 8 car.)"
              minLength={8}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="MEMBER">Membre</option>
              <option value="ADMIN">Admin</option>
              <option value="SUPER_ADMIN">Super-admin</option>
            </select>
            <select
              value={form.teamId}
              onChange={(e) => setForm((f) => ({ ...f, teamId: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Aucune équipe</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <div className="col-span-2 flex justify-end gap-2">
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

      {/* Table */}
      {loading ? (
        <p className="text-sm text-gray-400 py-8 text-center">Chargement…</p>
      ) : profiles.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">Aucun profil</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nom</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rôle</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Équipe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {profiles.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500">{p.email}</td>
                  <td className="px-4 py-3">
                    {isSuperAdmin ? (
                      <select
                        value={p.role}
                        onChange={(e) => handleRoleChange(p.id, e.target.value)}
                        className={cn(
                          "text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer",
                          ROLE_COLORS[p.role] ?? "bg-gray-100 text-gray-600"
                        )}
                      >
                        <option value="MEMBER">Membre</option>
                        <option value="ADMIN">Admin</option>
                        <option value="SUPER_ADMIN">Super-admin</option>
                      </select>
                    ) : (
                      <span className={cn("text-xs font-medium px-2 py-1 rounded-full", ROLE_COLORS[p.role] ?? "bg-gray-100 text-gray-600")}>
                        {ROLE_LABELS[p.role] ?? p.role}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isSuperAdmin ? (
                      <select
                        value={p.teamId ?? ""}
                        onChange={(e) => handleTeamChange(p.id, e.target.value)}
                        className="text-xs text-gray-600 border border-gray-200 rounded-lg px-2 py-1 bg-white"
                      >
                        <option value="">Aucune équipe</option>
                        {teams.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-gray-500">{p.team?.name ?? "—"}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
