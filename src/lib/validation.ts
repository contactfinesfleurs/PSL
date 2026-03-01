import { Prisma } from "@prisma/client";

// ─── Limits ──────────────────────────────────────────────────────────────────

export const MAX_NAME_LENGTH = 200;
export const MAX_TEXT_LENGTH = 5000;
export const MAX_NOTES_LENGTH = 2000;
export const MAX_ARRAY_ITEMS = 50;
export const MAX_ARRAY_ITEM_LENGTH = 100;
export const MAX_PATH_LENGTH = 500;
export const MAX_REFERENCE_LENGTH = 100;

// ─── Type guards ─────────────────────────────────────────────────────────────

/** Ensures the parsed JSON body is a plain object (not null, array, string, etc.). */
export function isJsonObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function isValidDate(v: unknown): v is string {
  if (typeof v !== "string") return false;
  return !isNaN(new Date(v).getTime());
}

export function isValidBudget(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0;
}

// ─── Array validators ─────────────────────────────────────────────────────────

export function validateStringArray(
  value: unknown,
  maxItemLength = MAX_ARRAY_ITEM_LENGTH
): string[] | null {
  if (!Array.isArray(value)) return null;
  if (value.length > MAX_ARRAY_ITEMS) return null;
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") return null;
    if (item.length > maxItemLength) return null;
    result.push(item);
  }
  return result;
}

/** Like validateStringArray but for file paths (longer max item length). */
export function validatePathArray(value: unknown): string[] | null {
  return validateStringArray(value, MAX_PATH_LENGTH);
}

/** Validate a measurements object: plain object, keys/values are strings ≤ 100 chars, ≤ 50 entries. */
export function validateMeasurements(value: unknown): Record<string, string> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > MAX_ARRAY_ITEMS) return null;
  const result: Record<string, string> = {};
  for (const [k, v] of entries) {
    if (k.length > MAX_ARRAY_ITEM_LENGTH || typeof v !== "string" || v.length > MAX_ARRAY_ITEM_LENGTH) return null;
    result[k] = v;
  }
  return result;
}

// ─── String utilities ─────────────────────────────────────────────────────────

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

// ─── Prisma error helpers ─────────────────────────────────────────────────────

export function isPrismaNotFound(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025"
  );
}

export function isPrismaUniqueConflict(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
  );
}

export function isPrismaFKViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003"
  );
}
