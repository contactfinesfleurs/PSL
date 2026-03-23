import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const profileCount = await prisma.profile.count();
    return NextResponse.json({
      ok: true,
      db: "connected",
      profiles: profileCount,
      env: {
        hasJwtSecret: !!process.env.JWT_SECRET,
        hasDbUrl: !!process.env.DATABASE_URL,
        nodeEnv: process.env.NODE_ENV,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        db: "error",
        error: error instanceof Error ? error.message : String(error),
        env: {
          hasJwtSecret: !!process.env.JWT_SECRET,
          hasDbUrl: !!process.env.DATABASE_URL,
          nodeEnv: process.env.NODE_ENV,
        },
      },
      { status: 503 }
    );
  }
}
