import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlanLimits } from "@/lib/plan-limits";
import { Crown, CheckCircle } from "lucide-react";
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
    <div className="space-y-10">
      <div>
        <h1 className="text-5xl font-light text-gray-900 tracking-tight">
          Paramètres
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Gérez votre abonnement et votre utilisation
        </p>
      </div>

      {/* Current Plan */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-medium text-gray-900">
              Plan actuel
            </h2>
            {isPro ? (
              <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-1 rounded-full">
                <Crown className="h-3 w-3" />
                PRO
              </span>
            ) : (
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                Gratuit
              </span>
            )}
          </div>
          <SettingsActions isPro={isPro} hasStripeCustomer={!!profile.stripeCustomerId} />
        </div>

        {/* Usage */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <UsageCard
            label="Produits"
            current={productCount}
            max={limits.maxProducts}
          />
          <UsageCard
            label="Événements"
            current={eventCount}
            max={limits.maxEvents}
          />
          <UsageCard
            label="Campagnes"
            current={campaignCount}
            max={limits.maxCampaigns}
          />
          <UsageCard
            label="Collaborateurs"
            current={collaboratorCount}
            max={limits.maxCollaborators}
          />
        </div>
      </div>

      {/* Upgrade CTA for FREE users */}
      {!isPro && (
        <div className="bg-gray-900 rounded-2xl p-8 text-white">
          <h3 className="text-lg font-medium">Passez au Pro</h3>
          <p className="text-sm text-gray-400 mt-2">
            Débloquez un accès illimité à toutes les fonctionnalités.
          </p>
          <ul className="mt-4 space-y-2">
            <li className="flex items-center gap-2 text-sm text-gray-300">
              <CheckCircle className="h-4 w-4 text-indigo-400" />
              Produits, événements et campagnes illimités
            </li>
            <li className="flex items-center gap-2 text-sm text-gray-300">
              <CheckCircle className="h-4 w-4 text-indigo-400" />
              Collaborateurs illimités
            </li>
            <li className="flex items-center gap-2 text-sm text-gray-300">
              <CheckCircle className="h-4 w-4 text-indigo-400" />
              Support prioritaire
            </li>
          </ul>
          <div className="mt-6 flex items-center gap-4">
            <SettingsActions isPro={false} hasStripeCustomer={false} showPricing />
          </div>
        </div>
      )}
    </div>
  );
}

function UsageCard({
  label,
  current,
  max,
}: {
  label: string;
  current: number;
  max: number;
}) {
  const isUnlimited = max === Infinity;
  const isAtLimit = !isUnlimited && current >= max;

  return (
    <div
      className={`rounded-xl border p-4 ${
        isAtLimit
          ? "border-amber-200 bg-amber-50"
          : "border-gray-200 bg-gray-50"
      }`}
    >
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-light text-gray-900 mt-1">
        {current}
        <span className="text-sm text-gray-400 font-normal">
          /{isUnlimited ? "∞" : max}
        </span>
      </p>
    </div>
  );
}
