import { safeParseArray } from "./formatters";

// ─── Business union types ──────────────────────────────────────────────────────

export type ProductFamily =
  | "accessories"
  | "pret-a-porter"
  | "shoes"
  | "leather-goods"
  | "small-leather-goods"
  | "other";

export type Season =
  | "FALL-WINTER"
  | "PRE-FALL"
  | "SPRING-SUMMER"
  | "CRUISE"
  | "RESORT";

export type SampleStatus = "PENDING" | "VALIDATED" | "NOT_VALIDATED";

export type LoanStatus = "SENT" | "RETURNED" | "LOST";

export type LoanPurpose =
  | "EDITORIAL"
  | "PRESS"
  | "EVENT"
  | "SHOWROOM"
  | "INFLUENCER"
  | "CELEBRITY";

export type EventType =
  | "SHOW"
  | "PRESENTATION"
  | "LAUNCH"
  | "PRESS"
  | "TRADE-SHOW"
  | "OTHER";

export type EventStatus = "DRAFT" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

export type CampaignType =
  | "DIGITAL"
  | "PRINT"
  | "OOH"
  | "SOCIAL"
  | "INFLUENCER"
  | "OTHER";

export type CampaignStatus =
  | "DRAFT"
  | "ACTIVE"
  | "PAUSED"
  | "COMPLETED"
  | "CANCELLED";

export type GuestCategory =
  | "VIP"
  | "PRESS"
  | "BUYER"
  | "INFLUENCER"
  | "INDUSTRY"
  | "GUEST";

export type RsvpStatus = "INVITED" | "CONFIRMED" | "DECLINED" | "WAITLIST";

export type PlacementType = "PRINT" | "DIGITAL" | "SOCIAL" | "TV" | "PODCAST";

export type TrackingStatus =
  | "InTransit"
  | "Delivered"
  | "NotFound"
  | "Pending";

// ─── JSON column helpers ───────────────────────────────────────────────────────

/**
 * Parse a JSON-serialised string array from a database column.
 * Delegates to safeParseArray — never throws, always returns string[].
 */
export function parseJsonArray(value: string | null | undefined): string[] {
  return safeParseArray(value);
}

/**
 * Parse a JSON color-code array (e.g. ["02","01"]) from a database column.
 * Delegates to safeParseArray — never throws, always returns string[].
 */
export function parseColors(value: string | null | undefined): string[] {
  return safeParseArray(value);
}

/**
 * Serialise a string array to its JSON representation for database storage.
 */
export function serializeJsonArray(arr: string[]): string {
  return JSON.stringify(arr);
}

// ─── Enum guard ────────────────────────────────────────────────────────────────

/**
 * Type-safe guard that checks whether a raw string belongs to a given union type.
 *
 * @example
 * if (isValidEnum(raw, ['SENT', 'RETURNED', 'LOST'] as const)) {
 *   // raw is now typed as LoanStatus
 * }
 */
export function isValidEnum<T extends string>(
  value: string,
  validValues: readonly T[],
): value is T {
  return (validValues as readonly string[]).includes(value);
}
