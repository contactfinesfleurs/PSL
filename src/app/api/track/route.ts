import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getProfileId, unauthorizedResponse, forbiddenResponse } from "@/lib/api-helpers";

const TrackEventSchema = z.object({
  a: z.string().optional(),
  z: z.string().optional(),
});

const TrackItemSchema = z.object({
  number: z.string(),
  track: z
    .object({
      z0: z.object({ z: z.number() }).optional(),
      z1: z.array(TrackEventSchema).optional(),
    })
    .optional(),
});

const TrackResponseSchema = z.object({
  data: z
    .object({
      accepted: z.array(TrackItemSchema).optional(),
    })
    .optional(),
});

// 17track status tag → human-readable status
const TAG_LABELS: Record<number, string> = {
  0:  "NotFound",
  10: "InTransit",
  20: "Expired",
  30: "PickUp",
  35: "Undelivered",
  40: "Delivered",
  50: "Alert",
};

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate
    const profileId = getProfileId(req);
    if (!profileId) {
      return unauthorizedResponse();
    }

    const bodyRaw: unknown = await req.json();
    const bodySchema = z.object({ trackingNumber: z.string(), sampleId: z.string() });
    const bodyParsed = bodySchema.safeParse(bodyRaw);
    if (!bodyParsed.success) {
      return NextResponse.json({ error: "trackingNumber and sampleId are required" }, { status: 400 });
    }
    const { trackingNumber, sampleId } = bodyParsed.data;

    // 2. Verify the sample exists and that its product belongs to the authenticated profile
    const sample = await prisma.sample.findUnique({
      where: { id: sampleId },
      include: { product: { select: { profileId: true } } },
    });

    if (!sample) {
      return NextResponse.json({ error: "Échantillon introuvable" }, { status: 404 });
    }

    if (!sample.product.profileId || sample.product.profileId !== profileId) {
      return forbiddenResponse("Vous n'avez pas accès à cet échantillon");
    }

    const apiKey = process.env.SEVENTEEN_TRACK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "17track API key not configured" }, { status: 500 });
    }

    // Call 17track API — apiKey intentionally not referenced in any error/log path
    let res: Response;
    try {
      res = await fetch("https://api.17track.net/track/v2.2/gettracklist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "17token": apiKey,
        },
        body: JSON.stringify({ data: [{ number: trackingNumber }] }),
      });
    } catch {
      console.error("[POST /api/track] External API unreachable");
      return NextResponse.json({ error: "17track API error" }, { status: 502 });
    }

    if (!res.ok) {
      return NextResponse.json({ error: "17track API error" }, { status: 502 });
    }

    const rawJson: unknown = await res.json();
    const parsed = TrackResponseSchema.safeParse(rawJson);
    if (!parsed.success) {
      return NextResponse.json({ error: "Unexpected response from 17track API" }, { status: 502 });
    }

    const item = parsed.data.data?.accepted?.[0];
    if (!item) {
      return NextResponse.json({ trackingStatus: "NotFound", receivedAt: null });
    }

    const tag = item.track?.z0?.z ?? 0;
    const trackingStatus = TAG_LABELS[tag] ?? "Unknown";

    // Extract delivery date from last event when delivered
    let receivedAt: string | null = null;
    if (tag === 40 && item.track?.z1?.length) {
      const lastEvent = item.track.z1[item.track.z1.length - 1];
      if (lastEvent?.z) receivedAt = lastEvent.z;
    }

    // Persist to DB
    await prisma.sample.update({
      where: { id: sampleId },
      data: {
        trackingStatus,
        ...(receivedAt ? { receivedAt: new Date(receivedAt) } : {}),
      },
    });

    return NextResponse.json({ trackingStatus, receivedAt });
  } catch (error) {
    console.error('[POST /api/track]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
