import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { TwoFactorSetup } from "@/components/settings/TwoFactorSetup";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const profile = await prisma.profile.findUnique({
    where: { id: session.profileId },
    select: { totpEnabled: true },
  });

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Paramètres</h1>

      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">
          Double authentification (2FA)
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Protégez votre compte avec un code à usage unique généré par une application
          comme Google Authenticator ou Authy.
        </p>

        <TwoFactorSetup initialEnabled={profile?.totpEnabled ?? false} />
      </section>
    </div>
  );
}
