import { NextRequest, NextResponse } from "next/server";
import { getProfileId, unauthorizedResponse } from "@/lib/api-helpers";
import spec from "../openapi.json";

export const dynamic = "force-dynamic";

/**
 * GET /api/docs
 *
 * Serves the OpenAPI 3.0 specification as JSON.
 * Requires authentication — the spec is not public.
 */
export async function GET(req: NextRequest) {
  const profileId = getProfileId(req);
  if (!profileId) return unauthorizedResponse();

  return NextResponse.json(spec);
}
