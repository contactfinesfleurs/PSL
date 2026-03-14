import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signToken, setSessionCookie } from "@/lib/auth";
import { parseBodyJson } from "@/lib/api-helpers";
import { getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const RegisterSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .max(100)
    .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule")
    .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre")
    .regex(/[^A-Za-z0-9]/, "Le mot de passe doit contenir au moins un caractère spécial"),
});

export async function POST(req: NextRequest) {
  try {
    // Rate limiting: max 5 attempts per IP per 15-minute window.
    const ip = getClientIp(req);
    const limited = await rateLimitResponse(ip);
    if (limited) return limited;

    const result = await parseBodyJson(req, RegisterSchema);
    if (!result.success) return result.response;
    const { name, email, password } = result.data;

    // Hash first — ensures constant-time response regardless of whether the
    // email is already registered, preventing timing-based email enumeration.
    const passwordHash = await hash(password, 12);

    const existing = await prisma.profile.findUnique({ where: { email } });
    if (existing) {
      // Message volontairement vague pour éviter l'énumération d'emails
      return NextResponse.json(
        { error: "Impossible de créer le compte avec ces informations" },
        { status: 409 }
      );
    }

    const profile = await prisma.profile.create({
      data: { name, email, passwordHash },
    });

    const token = await signToken({
      profileId: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
    });

    await setSessionCookie(token);

    return NextResponse.json(
      { name: profile.name, email: profile.email },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/auth/register]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
