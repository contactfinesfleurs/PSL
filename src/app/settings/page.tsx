import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlanLimits } from "@/lib/plan-limits";
import { Crown, CheckCircle, Package, Calendar, Tag, Users } from "lucide-react";
import { SettingsActions } from "./SettingsActions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  const profileId = session?.profileId ?? "";

  const profile = await prisma.profile.findUniqueOrThrow({
    where: { id: profileId },
    select: { plan: true, stripeCustomerId: true },
  });

  const [productCount, eventCount, campaignCount, collaboratorCount] =
    await Promise.all([
      prisma.product.count({ where: { profileId, deletedAt: null } }),
      prisma.event.count({ where: { profileId, deletedAt: null } }),
      prisma.campaign.count({ where: { profileId, deletedAt: null } }),
      prisma.teamMember.count({ where: { ownerId: profileId } }),
    ]);

  const limits = getPlanLimits(profile.plan);
  const isPro = profile.plan === "PRO";

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Paramètres</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gérez votre abonnement et votre utilisation
        </p>
      </div>

      {/* Plan section */}
      <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-gray-900">
              Plan actuel
            </h2>
            {isPro ? (
              <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-600 text-xs font-semibold px-2.5 py-0.5 rounded-full ring-1 ring-indigo-200">
                <Crown className="h-3 w-3" />
                Pro
              </span>
            ) : (
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
                Gratuit
              </span>
            )}
          </div>
          {isPro && profile.stripeCustomerId && (
            <SettingsActions isPro={isPro} hasStripeCustomer={!!profile.stripeCustomerId} />
          )}
        </div>

        {/* Usage grid */}
        <div className="px-6 py-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">
            Utilisation
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <UsageCard
              icon={<Package className="h-4 w-4" />}
              label="Produits"
              current={productCount}
              max={limits.maxProducts}
            />
            <UsageCard
              icon={<Calendar className="h-4 w-4" />}
              label="Événements"
              current={eventCount}
              max={limits.maxEvents}
            />
            <UsageCard
              icon={<Tag className="h-4 w-4" />}
              label="Campagnes"
              current={campaignCount}
              max={limits.maxCampaigns}
            />
            <UsageCard
              icon={<Users className="h-4 w-4" />}
              label="Collaborateurs"
              current={collaboratorCount}
              max={limits.maxCollaborators}
            />
          </div>
        </div>
      </section>

      {/* Upgrade CTA for FREE users */}
      {!isPro && (
        <section className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 text-white overflow-hidden">
          {/* Subtle decorative circle */}
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <Crown className="h-5 w-5 text-indigo-400" />
              <h3 className="text-lg font-semibold">Passez au Pro</h3>
            </div>
            <p className="text-sm text-gray-400 mb-6">
              Débloquez un accès illimité à toutes les fonctionnalités.
            </p>

            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2.5 text-sm text-gray-300">
                <CheckCircle className="h-4 w-4 text-indigo-400 shrink-0" />
                Produits, événements et campagnes illimités
              </li>
              <li className="flex items-center gap-2.5 text-sm text-gray-300">
                <CheckCircle className="h-4 w-4 text-indigo-400 shrink-0" />
                Collaborateurs illimités
              </li>
              <li className="flex items-center gap-2.5 text-sm text-gray-300">
                <CheckCircle className="h-4 w-4 text-indigo-400 shrink-0" />
                Support prioritaire
              </li>
            </ul>

            <SettingsActions isPro={false} hasStripeCustomer={false} showPricing />
          </div>
        </section>
      )}
    </div>
  );
}

function UsageCard({
  icon,
  label,
  current,
  max,
}: {
  icon: React.ReactNode;
  label: string;
  current: number;
  max: number;
}) {
  const isUnlimited = max === Infinity;
  const ratio = isUnlimited ? 0 : current / max;
  const isAtLimit = !isUnlimited && current >= max;
  const pct = isUnlimited ? 0 : Math.min(ratio * 100, 100);

  return (
    <div className="rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-center gap-2 text-gray-400">
        {icon}
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <p className="text-xl font-semibold text-gray-900">
        {current}
        <span className="text-sm font-normal text-gray-400 ml-0.5">
          /{isUnlimited ? "∞" : max}
        </span>
      </p>
      {!isUnlimited && (
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isAtLimit ? "bg-amber-400" : "bg-indigo-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
