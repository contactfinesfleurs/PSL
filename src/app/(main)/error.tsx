"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  const isDbError =
    error.message?.toLowerCase().includes("database") ||
    error.message?.toLowerCase().includes("prisma") ||
    error.message?.toLowerCase().includes("connect") ||
    error.message?.toLowerCase().includes("econnrefused");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-yellow-50 mb-4">
          <AlertTriangle className="h-7 w-7 text-yellow-500" />
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-2">
          {isDbError ? "Base de données inaccessible" : "Une erreur est survenue"}
        </h1>

        {isDbError ? (
          <p className="text-sm text-gray-600 mb-6">
            Impossible de se connecter à la base de données. Vérifiez que les
            variables d&apos;environnement{" "}
            <code className="bg-gray-100 px-1 rounded text-xs">DATABASE_URL</code>{" "}
            et{" "}
            <code className="bg-gray-100 px-1 rounded text-xs">
              DATABASE_URL_UNPOOLED
            </code>{" "}
            sont correctement configurées dans Vercel.
          </p>
        ) : (
          <p className="text-sm text-gray-600 mb-6">
            Une erreur inattendue s&apos;est produite. Veuillez réessayer.
          </p>
        )}

        {error.digest && (
          <p className="text-xs text-gray-400 mb-6">
            Code : {error.digest}
          </p>
        )}

        <button
          onClick={reset}
          className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}
