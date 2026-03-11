import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminPanel } from "@/components/admin/AdminPanel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const profile = await prisma.profile.findUnique({
    where: { id: session.profileId },
    select: { role: true, teamId: true },
  });

  if (!profile || (profile.role !== "SUPER_ADMIN" && profile.role !== "ADMIN")) {
    redirect("/");
  }

  return (
    <AdminPanel actingRole={profile.role} actingTeamId={profile.teamId} />
  );
}
