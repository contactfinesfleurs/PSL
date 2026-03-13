import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signToken, setSessionCookie } from "@/lib/auth";
import { parseBodyJson } from "@/lib/api-helpers";
import { getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    // Rate limiting: max 5 attempts per IP per 15-minute window.
    const ip = getClientIp(req);
    const limited = rateLimitResponse(ip);
    if (limited) return limited;

    const result = await parseBodyJson(req, LoginSchema);
    if (!result.success) return result.response;
    const { email, password } = result.data;

    const profile = await prisma.profile.findUnique({ where: { email } });

    if (!profile) {
      return NextResponse.json(
        { error: "Email ou mot de passe incorrect" },
        { status: 401 }
      );
    }

    const valid = await compare(password, profile.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Email ou mot de passe incorrect" },
        { status: 401 }
      );
    }

    const token = await signToken({
      profileId: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
    });

    await setSessionCookie(token);

    return NextResponse.json({ name: profile.name, email: profile.email });
  } catch (error) {
    console.error('[POST /api/auth/login]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
