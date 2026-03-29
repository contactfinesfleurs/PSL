"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Mode = "login" | "register";
type Phase = "credentials" | "totp";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Restrict redirect to same-origin relative paths.
  // Reject absolute URLs (https://...) and protocol-relative URLs (//evil.com).
  const rawFrom = searchParams.get("from") ?? "/";
  const from = rawFrom.startsWith("/") && !rawFrom.startsWith("//") ? rawFrom : "/";

  const [mode, setMode] = useState<Mode>("login");
  const [phase, setPhase] = useState<Phase>("credentials");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (phase === "totp") {
        // Second step: verify TOTP code
        const res = await fetch("/api/auth/2fa/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ challengeToken, code: totpCode }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data?.error ?? "Code invalide");
          return;
        }

        router.push(from);
        router.refresh();
        return;
      }

      // First step: credentials
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body =
        mode === "login"
          ? { email, password }
          : { name, email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Extract first field-level validation detail if present
        const firstDetail =
          data?.details && typeof data.details === "object"
            ? Object.values(data.details as Record<string, string[]>)[0]?.[0]
            : null;
        setError(firstDetail ?? data?.error ?? "Une erreur est survenue");
        return;
      }

      // Check if 2FA is required
      if (data.requires2fa && data.challengeToken) {
        setChallengeToken(data.challengeToken);
        setPhase("totp");
        setTotpCode("");
        return;
      }

      router.push(from);
      router.refresh();
    } catch {
      setError("Erreur réseau, réessayez.");
    } finally {
      setLoading(false);
    }
  }

  function handleBackToCredentials() {
    setPhase("credentials");
    setChallengeToken(null);
    setTotpCode("");
    setError(null);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo / titre */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            PSL Studio
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {phase === "totp"
              ? "Vérification en deux étapes"
              : mode === "login"
              ? "Connectez-vous à votre espace"
              : "Créez votre espace"}
          </p>
        </div>

        {/* Formulaire */}
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 shadow-sm"
        >
          {phase === "totp" ? (
            <>
              <p className="text-sm text-gray-600">
                Entrez le code à 6 chiffres de votre application d&apos;authentification.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code de vérification
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  minLength={6}
                  maxLength={6}
                  placeholder="000000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-center font-mono text-lg tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
              </div>
            </>
          ) : (
            <>
              {mode === "register" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom / Maison
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Ex. Maison Dupont"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="contact@maisonxyz.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={mode === "register" ? 8 : 1}
                  placeholder={mode === "register" ? "Minimum 8 caractères" : "••••••••"}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
                {mode === "register" && (
                  <p className="text-xs text-gray-400 mt-1">
                    Majuscule, chiffre et caractère spécial requis (ex&nbsp;: Abc1@xyz)
                  </p>
                )}
              </div>
            </>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            {loading
              ? "Chargement…"
              : phase === "totp"
              ? "Vérifier"
              : mode === "login"
              ? "Se connecter"
              : "Créer mon espace"}
          </button>

          {phase === "totp" && (
            <button
              type="button"
              onClick={handleBackToCredentials}
              className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Retour
            </button>
          )}
        </form>

        {/* Toggle mode */}
        {phase !== "totp" && (
          <p className="text-center text-sm text-gray-500 mt-4">
            {mode === "login" ? (
              <>
                Pas encore de compte ?{" "}
                <button
                  onClick={() => { setMode("register"); setError(null); }}
                  className="text-gray-900 font-medium hover:underline"
                >
                  Créer un espace
                </button>
              </>
            ) : (
              <>
                Déjà un compte ?{" "}
                <button
                  onClick={() => { setMode("login"); setError(null); }}
                  className="text-gray-900 font-medium hover:underline"
                >
                  Se connecter
                </button>
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
