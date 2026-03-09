import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * Extract the authenticated profileId from request headers injected by middleware.
 * Returns null if not present (should never happen behind middleware).
 */
export function getProfileId(req: NextRequest): string | null {
  return req.headers.get("x-profile-id");
}

/**
 * Returns a 401 response — use when getProfileId returns null.
 */
export function unauthorizedResponse() {
  return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
}

/**
 * Parse the request body as JSON and validate with a Zod schema.
 * Returns the parsed data on success, or a ready-to-return NextResponse on failure.
 *
 * @example
 * const result = await parseBodyJson(req, MySchema);
 * if (!result.success) return result.response;
 * const data = result.data;
 */
export async function parseBodyJson<T>(
  req: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return {
      success: false,
      response: NextResponse.json({ error: "Corps de requête JSON invalide." }, { status: 400 }),
    };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Données invalides.", details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      ),
    };
  }

  return { success: true, data: parsed.data };
}

/**
 * Validate a query-string value against a typed const enum array.
 * Returns undefined (and ignores the param) if the value is not in the enum.
 *
 * @example
 * const status = validateEnum(searchParams.get("status"), CAMPAIGN_STATUSES);
 */
export function validateEnum<T extends readonly string[]>(
  value: string | null,
  enumArray: T
): T[number] | undefined {
  if (!value) return undefined;
  return (enumArray as readonly string[]).includes(value)
    ? (value as T[number])
    : undefined;
}
