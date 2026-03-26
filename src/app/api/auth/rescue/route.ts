import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Endpoint de secours pour réinitialiser un mot de passe oublié.
// Nécessite la variable d'environnement RESCUE_SECRET pour être activé.
// À désactiver (supprimer la var d'env) une fois le mot de passe réinitialisé.

const Schema = z.object({
  secret: z.string().min(1),
  email: z.string().email(),
  newPassword: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const rescueSecret = process.env.RESCUE_SECRET;
  if (!rescueSecret) {
    return NextResponse.json({ error: "Non disponible" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 422 });
  }

  const { secret, email, newPassword } = parsed.data;

  if (secret !== rescueSecret) {
    return NextResponse.json({ error: "Secret invalide" }, { status: 403 });
  }

  const profile = await prisma.profile.findUnique({ where: { email } });
  if (!profile) {
    return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
  }

  const passwordHash = await hash(newPassword, 12);
  await prisma.profile.update({
    where: { email },
    data: { passwordHash },
  });

  return NextResponse.json({ ok: true, email: profile.email, name: profile.name });
}
