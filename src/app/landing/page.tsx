"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

function SketchSVG() {
  return (
    <svg
      viewBox="0 0 160 180"
      className="w-36 h-36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Neckline */}
      <path
        d="M80,18 Q68,28 60,38 M80,18 Q92,28 100,38"
        stroke="#bbb"
        strokeWidth="1.5"
        strokeDasharray="4,2.5"
        strokeLinecap="round"
      />
      {/* Left shoulder */}
      <path
        d="M60,38 L38,55 Q32,62 35,74 L42,90"
        stroke="#bbb"
        strokeWidth="1.5"
        strokeDasharray="4,2.5"
        strokeLinecap="round"
      />
      {/* Right shoulder */}
      <path
        d="M100,38 L122,55 Q128,62 125,74 L118,90"
        stroke="#bbb"
        strokeWidth="1.5"
        strokeDasharray="4,2.5"
        strokeLinecap="round"
      />
      {/* Bodice left */}
      <path
        d="M60,38 L55,90 L48,155"
        stroke="#bbb"
        strokeWidth="1.5"
        strokeDasharray="4,2.5"
        strokeLinecap="round"
      />
      {/* Bodice right */}
      <path
        d="M100,38 L105,90 L112,155"
        stroke="#bbb"
        strokeWidth="1.5"
        strokeDasharray="4,2.5"
        strokeLinecap="round"
      />
      {/* Hem */}
      <path
        d="M48,155 Q80,163 112,155"
        stroke="#bbb"
        strokeWidth="1.5"
        strokeDasharray="4,2.5"
        strokeLinecap="round"
      />
      {/* Waist line */}
      <path
        d="M55,90 Q80,96 105,90"
        stroke="#ddd"
        strokeWidth="1"
        strokeDasharray="3,3"
        strokeLinecap="round"
      />
      {/* Sleeve underarm detail */}
      <path
        d="M42,90 L55,90"
        stroke="#ccc"
        strokeWidth="1"
        strokeDasharray="2,2"
      />
      <path
        d="M118,90 L105,90"
        stroke="#ccc"
        strokeWidth="1"
        strokeDasharray="2,2"
      />
      {/* Cross-hatch sketch marks */}
      <path
        d="M62,110 L58,120 M65,108 L61,118 M68,108 L64,118"
        stroke="#e0e0e0"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
      {/* Measurement annotation */}
      <line
        x1="20"
        y1="38"
        x2="20"
        y2="155"
        stroke="#eee"
        strokeWidth="0.7"
        strokeDasharray="2,3"
      />
      <line x1="17" y1="38" x2="23" y2="38" stroke="#eee" strokeWidth="0.7" />
      <line
        x1="17"
        y1="155"
        x2="23"
        y2="155"
        stroke="#eee"
        strokeWidth="0.7"
      />
      {/* Notes */}
      <text
        x="28"
        y="170"
        fontSize="7"
        fill="#d0d0d0"
        fontFamily="monospace"
        letterSpacing="0.5"
      >
        ébauche v1
      </text>
    </svg>
  );
}

function ProductSVG() {
  return (
    <svg
      viewBox="0 0 160 180"
      className="w-36 h-36"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Dress body fill */}
      <path
        d="M60,38 L55,90 L48,155 Q80,163 112,155 L105,90 L100,38 Q92,28 80,18 Q68,28 60,38 Z"
        fill="#7c3aed"
        stroke="#5b21b6"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Left sleeve */}
      <path
        d="M60,38 L38,55 Q32,62 35,74 L42,90 L55,90 Z"
        fill="#6d28d9"
        stroke="#5b21b6"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Right sleeve */}
      <path
        d="M100,38 L122,55 Q128,62 125,74 L118,90 L105,90 Z"
        fill="#6d28d9"
        stroke="#5b21b6"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Neckline accent */}
      <path
        d="M80,18 Q68,28 60,38 Q80,44 100,38 Q92,28 80,18 Z"
        fill="#5b21b6"
        stroke="#4c1d95"
        strokeWidth="1"
      />
      {/* Waist belt */}
      <path
        d="M55,90 Q80,96 105,90 L105,98 Q80,104 55,98 Z"
        fill="#4c1d95"
        stroke="#3b1375"
        strokeWidth="1"
      />
      {/* Fabric sheen / highlight */}
      <ellipse
        cx="75"
        cy="65"
        rx="5"
        ry="12"
        fill="white"
        opacity="0.12"
        transform="rotate(-8, 75, 65)"
      />
      {/* Decorative buttons */}
      <circle cx="80" cy="50" r="2.5" fill="white" opacity="0.7" />
      {/* Belt buckle */}
      <rect
        x="76"
        y="91"
        width="8"
        height="5"
        rx="1"
        fill="#a78bfa"
        stroke="#7c3aed"
        strokeWidth="0.5"
      />
      {/* Price tag */}
      <rect
        x="116"
        y="50"
        width="32"
        height="20"
        rx="3"
        fill="white"
        stroke="#ede9fe"
        strokeWidth="1"
      />
      <text
        x="121"
        y="61"
        fontSize="6.5"
        fill="#7c3aed"
        fontFamily="monospace"
        fontWeight="bold"
      >
        REF-001
      </text>
      <text x="121" y="68" fontSize="5.5" fill="#a78bfa" fontFamily="monospace">
        SS-2025
      </text>
      {/* Approval stamp */}
      <text
        x="20"
        y="170"
        fontSize="7"
        fill="#7c3aed"
        fontFamily="monospace"
        letterSpacing="0.5"
        fontWeight="bold"
      >
        ✓ approuvé
      </text>
    </svg>
  );
}

export default function LandingPage() {
  const [isSketch, setIsSketch] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsSketch((prev) => !prev);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* ── Navigation ─────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <span className="text-lg font-bold tracking-tight text-gray-900">
          PSL Studio
        </span>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors hidden sm:block"
          >
            Se connecter
          </Link>
          <Link
            href="/login"
            className="bg-gray-900 text-white text-sm font-semibold px-5 py-2 rounded-full hover:bg-gray-700 transition-all"
          >
            Commencer gratuitement
          </Link>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="pt-28 pb-20 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-purple-50 text-purple-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-8 tracking-wide uppercase">
            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
            Du croquis au produit fini
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-tight mb-6">
            Gérez vos collections
            <br />
            <span className="text-purple-600">de A à Z.</span>
          </h1>

          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            De l&apos;idée au produit fini. Organisez vos croquis, suivez vos
            échantillons, coordonnez vos événements et campagnes.{" "}
            <span className="text-gray-900 font-medium">
              Tout dans un seul endroit.
            </span>
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/login"
              className="bg-gray-900 text-white font-semibold px-8 py-4 rounded-full text-base hover:bg-gray-700 transition-all hover:scale-105 shadow-lg shadow-gray-200"
            >
              Démarrer gratuitement
            </Link>
            <a
              href="#features"
              className="text-gray-500 font-medium flex items-center gap-1.5 hover:text-gray-900 transition-colors"
            >
              Découvrir les fonctionnalités
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </a>
          </div>

          {/* ── Animated Demo ─────────────────────────────────────── */}
          <div className="relative mx-auto max-w-xs">
            {/* State labels */}
            <div className="flex justify-between text-xs font-semibold tracking-widest uppercase px-1 mb-3">
              <span
                className={`transition-colors duration-700 ${isSketch ? "text-gray-900" : "text-gray-300"}`}
              >
                Croquis
              </span>
              <span className="text-gray-300">→</span>
              <span
                className={`transition-colors duration-700 ${!isSketch ? "text-purple-600" : "text-gray-300"}`}
              >
                Produit fini
              </span>
            </div>

            {/* Card */}
            <div
              className={`relative h-64 rounded-3xl overflow-hidden border-2 shadow-2xl transition-colors duration-1000 ${isSketch ? "border-gray-200 bg-gray-50/80" : "border-purple-200 bg-purple-50/60"}`}
            >
              {/* Sketch */}
              <div
                className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-1000 ${isSketch ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
              >
                <SketchSVG />
                <p className="text-xs text-gray-300 font-mono mt-1 tracking-tight">
                  croquis_initial.sketch
                </p>
              </div>

              {/* Finished product */}
              <div
                className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-1000 ${!isSketch ? "opacity-100 scale-100" : "opacity-0 scale-110"}`}
              >
                <ProductSVG />
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <p className="text-xs text-gray-400 font-medium">
                    Approuvé · REF-001 · SS-2025
                  </p>
                </div>
              </div>

              {/* Corner badge */}
              <div
                className={`absolute top-3 right-3 transition-all duration-500 ${!isSketch ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}`}
              >
                <span className="text-xs bg-green-100 text-green-700 font-semibold px-2.5 py-1 rounded-full">
                  ✓ Finalisé
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-3 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full bg-purple-500 rounded-full transition-all duration-1000 ease-in-out ${!isSketch ? "w-full" : "w-0"}`}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────── */}
      <section id="features" className="py-20 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Un flux de travail complet,
              <br />
              <span className="text-purple-600">sans changer d&apos;outil</span>
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              PSL Studio centralise chaque étape de la vie d&apos;un produit de
              mode — du premier trait de crayon à la vente.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Products */}
            <div className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="w-11 h-11 bg-purple-50 rounded-xl flex items-center justify-center mb-5">
                <svg
                  className="w-5 h-5 text-purple-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2">
                Produits &amp; Croquis
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Importez vos croquis, gérez les fiches techniques, références
                couleurs et matières. Suivez l&apos;évolution vers le produit
                fini étape par étape.
              </p>
            </div>

            {/* Events */}
            <div className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center mb-5">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2">
                Événements
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Défilés, showrooms, lancements de presse — planifiez vos
                événements, gérez les invités et liez vos collections
                directement.
              </p>
            </div>

            {/* Campaigns */}
            <div className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="w-11 h-11 bg-rose-50 rounded-xl flex items-center justify-center mb-5">
                <svg
                  className="w-5 h-5 text-rose-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                  />
                </svg>
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2">
                Campagnes
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Planifiez vos campagnes digitales, print et social. Budgets,
                timelines et liens avec vos collections et événements — tout
                synchronisé.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Value prop ─────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-8">
            Du croquis.
            <br />
            <span className="text-purple-600">Au produit fini.</span>
            <br />
            <span className="text-gray-400">En un seul endroit.</span>
          </h2>
          <p className="text-gray-500 text-xl max-w-xl mx-auto mb-10">
            Arrêtez de jongler entre les outils. PSL Studio unifie toute la
            gestion de votre collection mode.
          </p>
          <div className="flex flex-wrap justify-center gap-2.5">
            {[
              "Croquis & Tech Packs",
              "Échantillons",
              "Suivi logistique",
              "Événements & Défilés",
              "Campagnes marketing",
              "Look Books",
              "Projets collaboratifs",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-4 py-1.5 text-sm text-gray-600"
              >
                <svg
                  className="w-3.5 h-3.5 text-purple-500 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              Tarifs simples et transparents
            </h2>
            <p className="text-gray-500 text-lg">
              Commencez gratuitement. Évoluez quand vous êtes prêt.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            {/* ─ Free ─ */}
            <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm flex flex-col">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  Gratuit
                </h3>
                <p className="text-gray-400 text-sm mb-6">
                  Pour découvrir PSL Studio
                </p>
                <div className="mb-8">
                  <span className="text-5xl font-bold text-gray-900">0 €</span>
                  <span className="text-gray-400 text-sm ml-2">
                    pour toujours
                  </span>
                </div>
              </div>
              <Link
                href="/login"
                className="block w-full text-center py-3.5 rounded-2xl border-2 border-gray-900 text-gray-900 font-semibold hover:bg-gray-900 hover:text-white transition-all duration-200 mb-8"
              >
                Commencer gratuitement
              </Link>
              <ul className="space-y-3.5 mt-auto">
                {[
                  "Jusqu'à 10 produits",
                  "5 événements par mois",
                  "2 campagnes actives",
                  "Gestion des croquis",
                  "Fiches techniques de base",
                ].map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-3 text-sm text-gray-600"
                  >
                    <svg
                      className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* ─ Pro ─ */}
            <div className="bg-gray-900 rounded-3xl p-8 border border-gray-800 shadow-2xl flex flex-col relative overflow-hidden">
              <div
                className="absolute top-0 right-0 bg-purple-500 text-white text-xs font-bold px-4 py-1.5 rounded-bl-2xl tracking-wide"
                style={{ borderRadius: "0 1.5rem 0 1rem" }}
              >
                Recommandé
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Pro</h3>
                <p className="text-gray-400 text-sm mb-6">
                  Pour les équipes créatives
                </p>
                <div className="mb-8">
                  <span className="text-5xl font-bold text-white">9,99 €</span>
                  <span className="text-gray-400 text-sm ml-2">/ mois</span>
                </div>
              </div>
              <Link
                href="/login"
                className="block w-full text-center py-3.5 rounded-2xl bg-white text-gray-900 font-semibold hover:bg-gray-100 transition-all duration-200 mb-8"
              >
                Démarrer l&apos;essai gratuit
              </Link>
              <ul className="space-y-3.5 mt-auto">
                {[
                  "Produits illimités",
                  "Événements illimités",
                  "Campagnes illimitées",
                  "Suivi d'échantillons avancé",
                  "Look Books & partage",
                  "Projets collaboratifs",
                  "Intégration suivi colis",
                  "Support prioritaire",
                ].map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-3 text-sm text-gray-300"
                  >
                    <svg
                      className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer CTA ─────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-gray-900 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Prêt à simplifier votre processus créatif ?
          </h2>
          <p className="text-gray-400 text-lg mb-8">
            Rejoignez les équipes qui gèrent leurs collections de A à Z avec PSL
            Studio.
          </p>
          <Link
            href="/login"
            className="inline-block bg-white text-gray-900 font-semibold px-8 py-4 rounded-full text-base hover:bg-gray-100 transition-all hover:scale-105"
          >
            Commencer gratuitement →
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="py-6 px-6 bg-gray-900 border-t border-gray-800 text-center">
        <p className="text-gray-500 text-sm">
          © 2025 PSL Studio · Gestion de collections mode ·{" "}
          <Link
            href="/login"
            className="text-gray-400 hover:text-white ml-1 transition-colors"
          >
            Se connecter
          </Link>
        </p>
      </footer>
    </div>
  );
}
