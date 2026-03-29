"use client";

import { useState } from "react";

type Step = "idle" | "setup" | "enabled";

export function TwoFactorSetup({ initialEnabled }: { initialEnabled: boolean }) {
  const [step, setStep] = useState<Step>(initialEnabled ? "enabled" : "idle");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [manualKey, setManualKey] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleStartSetup() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/setup");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Erreur lors de la configuration");
        return;
      }
      const data = await res.json();
      setQrCodeDataUrl(data.qrCodeDataUrl);
      setManualKey(data.manualEntryKey);
      setStep("setup");
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Code invalide");
        return;
      }
      setStep("enabled");
      setCode("");
      setQrCodeDataUrl(null);
      setManualKey(null);
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Code invalide");
        return;
      }
      setStep("idle");
      setCode("");
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  if (step === "idle") {
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-block w-2 h-2 rounded-full bg-yellow-400" />
          <span className="text-sm text-gray-600">Désactivée</span>
        </div>
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
            {error}
          </p>
        )}
        <button
          onClick={handleStartSetup}
          disabled={loading}
          className="bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {loading ? "Chargement…" : "Activer la 2FA"}
        </button>
      </div>
    );
  }

  if (step === "setup") {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
          <span className="text-sm text-gray-600">Configuration en cours</span>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            1. Scannez ce QR code avec votre application d&apos;authentification :
          </p>

          {qrCodeDataUrl && (
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrCodeDataUrl}
                alt="QR Code 2FA"
                className="w-48 h-48 border border-gray-200 rounded-lg"
              />
            </div>
          )}

          {manualKey && (
            <div>
              <p className="text-sm text-gray-500 mb-1">Ou entrez cette clé manuellement :</p>
              <code className="block bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono break-all select-all">
                {manualKey}
              </code>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-3">
            <p className="text-sm text-gray-600">
              2. Entrez le code à 6 chiffres pour confirmer :
            </p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              minLength={6}
              maxLength={6}
              placeholder="000000"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-center font-mono text-lg tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-gray-300"
            />

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {loading ? "Vérification…" : "Confirmer"}
              </button>
              <button
                type="button"
                onClick={() => { setStep("idle"); setError(null); setCode(""); }}
                className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 transition-colors"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // step === "enabled"
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
        <span className="text-sm font-medium text-green-700">Activée</span>
      </div>

      <form onSubmit={handleDisable} className="space-y-3">
        <p className="text-sm text-gray-600">
          Pour désactiver la 2FA, entrez un code de vérification :
        </p>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          required
          minLength={6}
          maxLength={6}
          placeholder="000000"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-center font-mono text-lg tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-gray-300"
        />

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {loading ? "Désactivation…" : "Désactiver la 2FA"}
        </button>
      </form>
    </div>
  );
}
