import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Plus, FolderKanban } from "lucide-react";
import { JoinProjectButton } from "./JoinProjectButton";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const session = await getSession();
  const profileId = session?.profileId ?? "";

  const [ownedProjects, memberships] = await Promise.all([
    prisma.project.findMany({
      where: { profileId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { products: true, collaborators: true, contributions: true } },
      },
    }),
    prisma.projectCollaborator.findMany({
      where: { profileId },
      orderBy: { joinedAt: "desc" },
      include: {
        project: {
          include: {
            profile: { select: { id: true, name: true } },
            _count: { select: { products: true, contributions: true } },
          },
        },
      },
    }),
  ]);

  const joinedProjects = memberships.map((m) => ({
    ...m.project,
    joinedAt: m.joinedAt,
  }));

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-5xl font-light text-gray-900 tracking-tight">Projets</h1>
          <p className="text-sm text-gray-500 mt-2">
            Collaborez sur des collections avec d&apos;autres profils
          </p>
        </div>
        <div className="flex items-center gap-3">
          <JoinProjectButton />
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nouveau projet
          </Link>
        </div>
      </div>

      {/* Owned projects */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          Mes projets
        </h2>
        {ownedProjects.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <FolderKanban className="mx-auto h-10 w-10 text-gray-300 mb-4" />
            <p className="text-gray-500 text-sm">Aucun projet créé</p>
            <Link
              href="/projects/new"
              className="mt-3 inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline"
            >
              <Plus className="h-3 w-3" />
              Créer un projet
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ownedProjects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.code}`}
                className="bg-white border border-gray-200 rounded-2xl hover:border-gray-300 transition-colors p-5 block"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-gray-900 text-sm truncate">{project.name}</p>
                  <span className="text-[10px] font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded shrink-0">
                    {project.code}
                  </span>
                </div>
                {project.description && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{project.description}</p>
                )}
                <div className="mt-3 flex gap-4 text-xs text-gray-400">
                  <span>{project._count.products} produit(s)</span>
                  <span>{project._count.collaborators} collaborateur(s)</span>
                  {project._count.contributions > 0 && (
                    <span>{project._count.contributions} contribution(s)</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Joined projects */}
      {joinedProjects.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Projets rejoints
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {joinedProjects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.code}`}
                className="bg-white border border-indigo-100 rounded-2xl hover:border-indigo-200 transition-colors p-5 block"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-gray-900 text-sm truncate">{project.name}</p>
                  <span className="text-[10px] font-mono bg-indigo-50 text-indigo-400 px-2 py-0.5 rounded shrink-0">
                    {project.code}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Par {project.profile.name}
                </p>
                <div className="mt-3 flex gap-4 text-xs text-gray-400">
                  <span>{project._count.products} produit(s)</span>
                  {project._count.contributions > 0 && (
                    <span>{project._count.contributions} contribution(s)</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
