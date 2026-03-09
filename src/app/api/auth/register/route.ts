import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signToken, setSessionCookie } from "@/lib/auth";
import { parseBodyJson } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const RegisterSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export async function POST(req: NextRequest) {
  const result = await parseBodyJson(req, RegisterSchema);
  if (!result.success) return result.response;
  const { name, email, password } = result.data;

  const existing = await prisma.profile.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Un compte avec cet email existe déjà" },
      { status: 409 }
    );
  }

  const passwordHash = await hash(password, 12);

  const profile = await prisma.profile.create({
    data: { name, email, passwordHash },
  });

  const token = await signToken({
    profileId: profile.id,
    email: profile.email,
    name: profile.name,
  });

  await setSessionCookie(token);

  return NextResponse.json(
    { name: profile.name, email: profile.email },
    { status: 201 }
  );
}
