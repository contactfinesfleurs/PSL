"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";

export function JoinProjectButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/projects/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim().toLowerCase() }),
    });

    if (res.ok) {
      const data = await res.json();
      setOpen(false);
      setCode("");
      router.push(`/projects/${data.code}`);
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Code introuvable.");
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 border border-gray-300 hover:border-gray-400 text-gray-700 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
      >
        <LogIn className="h-4 w-4" />
        Rejoindre un projet
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Rejoindre un projet
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Entrez le code projet partagé par un collaborateur.
            </p>
            <form onSubmit={handleJoin} className="space-y-4">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="ex. a3f9c12b"
                maxLength={20}
                autoFocus
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading || !code.trim()}
                  className="flex-1 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                >
                  {loading ? "Vérification…" : "Rejoindre"}
                </button>
                <button
                  type="button"
                  onClick={() => { setOpen(false); setCode(""); setError(null); }}
                  className="text-sm text-gray-600 hover:text-gray-800 px-3"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
