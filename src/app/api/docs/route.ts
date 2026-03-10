import { NextResponse } from "next/server";
import spec from "../openapi.json";

export const dynamic = "force-static";

/**
 * GET /api/docs
 *
 * Serves the OpenAPI 3.0 specification as JSON.
 * The spec is imported at build time from openapi.json — no filesystem reads at runtime.
 */
export async function GET() {
  return NextResponse.json(spec, {
    headers: {
      // Allow Swagger UI, Redoc, and other tooling to consume the spec cross-origin
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
