import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Endpoint disponible uniquement quand BYPASS_AUTH=1
// Crée le profil dev en base si il n'existe pas encore.
// Visiter /api/dev/init une seule fois suffit.

const DEV_PROFILE_ID = "dev-bypass-profile-001";
const DEV_PROFILE_EMAIL = "dev@psl.local";
const DEV_PROFILE_NAME = "Développeur";

export async function GET() {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.BYPASS_AUTH !== "1"
  ) {
    return NextResponse.json({ error: "Non disponible" }, { status: 404 });
  }

  const existing = await prisma.profile.findUnique({ where: { id: DEV_PROFILE_ID } });
  if (existing) {
    return NextResponse.json({ ok: true, message: "Profil dev déjà présent", id: existing.id });
  }

  const passwordHash = await hash("Dev-bypass-not-used", 10);
  const profile = await prisma.profile.create({
    data: {
      id: DEV_PROFILE_ID,
      name: DEV_PROFILE_NAME,
      email: DEV_PROFILE_EMAIL,
      passwordHash,
    },
  });

  return NextResponse.json({ ok: true, message: "Profil dev créé", id: profile.id });
}
