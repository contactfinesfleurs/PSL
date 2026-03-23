import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ProjectWithCollaborators = Awaited<ReturnType<typeof findProjectWithAccess>>;

async function findProjectWithAccess(code: string) {
  return prisma.project.findUnique({
    where: { code },
    include: { collaborators: { select: { profileId: true } } },
  });
}

type ProjectAccessResult =
  | {
      ok: true;
      project: NonNullable<ProjectWithCollaborators>;
      isOwner: boolean;
      isCollaborator: boolean;
    }
  | { ok: false; response: NextResponse };

/**
 * Verify that a profile has access to a project (owner or collaborator).
 * Returns the project + access flags on success, or a ready-to-return
 * NextResponse (404 / 403) on failure.
 */
export async function checkProjectAccess(
  code: string,
  profileId: string
): Promise<ProjectAccessResult> {
  const project = await findProjectWithAccess(code);

  if (!project) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Projet introuvable." }, { status: 404 }),
    };
  }

  const isOwner = project.profileId === profileId;
  const isCollaborator = project.collaborators.some((c) => c.profileId === profileId);

  if (!isOwner && !isCollaborator) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Accès refusé." }, { status: 403 }),
    };
  }

  return { ok: true, project, isOwner, isCollaborator };
}
