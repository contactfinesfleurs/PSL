import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import {
  Package,
  Calendar,
  Tag,
  Users,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Shield,
  Zap,
} from "lucide-react";

export default async function LandingPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-6xl mx-auto">
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">
          PSL Studio
        </h1>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Se connecter
          </Link>
          <Link
            href="/login"
            className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Commencer
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-8 pt-20 pb-24 max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-600 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
          <Sparkles className="h-3.5 w-3.5" />
          Gestion de collections mode
        </div>
        <h2 className="text-5xl sm:text-6xl font-light text-gray-900 tracking-tight leading-tight max-w-3xl mx-auto">
          Pilotez vos collections du{" "}
          <span className="font-medium">prototype</span> au{" "}
          <span className="font-medium">placement presse</span>
        </h2>
        <p className="mt-6 text-lg text-gray-500 max-w-2xl mx-auto">
          Produits, samples, événements, campagnes et retombées presse.
          Tout votre workflow mode dans un seul outil.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Commencer gratuitement
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="px-8 py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-2xl font-light text-gray-900 text-center mb-12">
            Tout ce dont vous avez besoin
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<Package className="h-5 w-5" />}
              title="Produits"
              description="Fiches produit, tech packs, SKU automatiques et suivi des samples."
            />
            <FeatureCard
              icon={<Calendar className="h-5 w-5" />}
              title="Événements"
              description="Fashion weeks, showrooms, présentations avec gestion des invités."
            />
            <FeatureCard
              icon={<Tag className="h-5 w-5" />}
              title="Campagnes"
              description="Campagnes marketing avec budget, planning et produits associés."
            />
            <FeatureCard
              icon={<Users className="h-5 w-5" />}
              title="Collaboration"
              description="Travaillez en équipe sur vos collections et partagez l'accès."
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-8 py-20">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-light text-gray-900 text-center mb-4">
            Tarifs simples et transparents
          </h3>
          <p className="text-sm text-gray-500 text-center mb-12">
            Commencez gratuitement, passez au Pro quand vous en avez besoin.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free */}
            <div className="bg-white border border-gray-200 rounded-2xl p-8">
              <h4 className="text-lg font-medium text-gray-900">Gratuit</h4>
              <p className="text-sm text-gray-500 mt-1">
                Pour démarrer et tester
              </p>
              <div className="mt-6">
                <span className="text-4xl font-light text-gray-900">0&euro;</span>
                <span className="text-sm text-gray-500 ml-1">/mois</span>
              </div>
              <ul className="mt-8 space-y-3">
                <PricingFeature text="2 produits" />
                <PricingFeature text="1 événement" />
                <PricingFeature text="1 campagne" />
                <PricingFeature text="1 collaborateur" />
              </ul>
              <Link
                href="/login"
                className="mt-8 block text-center w-full border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Commencer gratuitement
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-gray-900 text-white rounded-2xl p-8 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-indigo-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                  Populaire
                </span>
              </div>
              <h4 className="text-lg font-medium">Pro</h4>
              <p className="text-sm text-gray-400 mt-1">
                Pour les maisons ambitieuses
              </p>
              <div className="mt-6">
                <span className="text-4xl font-light">11,99&euro;</span>
                <span className="text-sm text-gray-400 ml-1">/mois</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                ou 99,99&euro;/an (2 mois offerts)
              </p>
              <ul className="mt-8 space-y-3">
                <PricingFeature text="Produits illimités" light />
                <PricingFeature text="Événements illimités" light />
                <PricingFeature text="Campagnes illimitées" light />
                <PricingFeature text="Collaborateurs illimités" light />
                <PricingFeature text="Support prioritaire" light />
              </ul>
              <Link
                href="/login"
                className="mt-8 block text-center w-full bg-white text-gray-900 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Passer au Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="px-8 py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Données sécurisées
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Rapide et intuitif
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Conçu pour la mode
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-8 py-8 border-t border-gray-100">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-gray-400">
          <span>&copy; {new Date().getFullYear()} PSL Studio</span>
          <Link href="/login" className="hover:text-gray-600 transition-colors">
            Se connecter
          </Link>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="text-gray-400">{icon}</div>
      <h4 className="text-sm font-medium text-gray-900 mt-4">{title}</h4>
      <p className="text-xs text-gray-500 mt-2 leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function PricingFeature({ text, light }: { text: string; light?: boolean }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <CheckCircle
        className={`h-4 w-4 flex-shrink-0 ${
          light ? "text-indigo-400" : "text-green-500"
        }`}
      />
      <span className={light ? "text-gray-300" : "text-gray-600"}>{text}</span>
    </li>
  );
}
