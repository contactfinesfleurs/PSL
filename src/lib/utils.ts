import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const PRODUCT_FAMILIES = [
  { value: "accessories", label: "Accessoires" },
  { value: "pret-a-porter", label: "Prêt-à-porter" },
  { value: "shoes", label: "Chaussures" },
  { value: "leather-goods", label: "Maroquinerie" },
  { value: "small-leather-goods", label: "Petite maroquinerie" },
  { value: "jewelry", label: "Bijoux" },
  { value: "fragrance", label: "Parfum" },
  { value: "other", label: "Autre" },
] as const;

export const SEASONS = [
  { value: "FALL-WINTER", label: "Automne-Hiver" },
  { value: "PRE-FALL", label: "Pré-Collection" },
  { value: "SPRING-SUMMER", label: "Printemps-Été" },
  { value: "CRUISE", label: "Croisière" },
  { value: "RESORT", label: "Resort" },
] as const;

export const SIZE_RANGES = [
  { value: "XS-XXL", label: "XS → XXL" },
  { value: "S-XL", label: "S → XL" },
  { value: "30-44", label: "30 → 44 (FR pantalon)" },
  { value: "35-46", label: "35 → 46 (chaussures)" },
  { value: "36-42", label: "36 → 42 (chaussures femme)" },
  { value: "ONE-SIZE", label: "Taille unique" },
  { value: "CUSTOM", label: "Personnalisé" },
] as const;

export const EVENT_TYPES = [
  { value: "SHOW", label: "Défilé" },
  { value: "PRESENTATION", label: "Présentation" },
  { value: "LAUNCH", label: "Lancement" },
  { value: "PRESS", label: "Presse" },
  { value: "TRADE-SHOW", label: "Salon professionnel" },
  { value: "OTHER", label: "Autre" },
] as const;

export const CAMPAIGN_TYPES = [
  { value: "DIGITAL", label: "Digital" },
  { value: "PRINT", label: "Print" },
  { value: "OOH", label: "Affichage (OOH)" },
  { value: "SOCIAL", label: "Réseaux sociaux" },
  { value: "INFLUENCER", label: "Influenceur" },
  { value: "OTHER", label: "Autre" },
] as const;

// ─── Color codes ──────────────────────────────────────────────────────────────

export const COLOR_CODES = [
  { code: "01", label: "Blanc" },
  { code: "02", label: "Noir" },
  { code: "03", label: "Écru / Ivoire" },
  { code: "04", label: "Beige / Camel" },
  { code: "05", label: "Gris clair" },
  { code: "06", label: "Gris foncé" },
  { code: "07", label: "Marine" },
  { code: "08", label: "Bleu ciel" },
  { code: "09", label: "Bleu royal" },
  { code: "10", label: "Rouge" },
  { code: "11", label: "Bordeaux" },
  { code: "12", label: "Rose" },
  { code: "13", label: "Vert" },
  { code: "14", label: "Kaki / Olive" },
  { code: "15", label: "Jaune / Doré" },
  { code: "16", label: "Orange / Terracotta" },
  { code: "17", label: "Marron / Chocolat" },
  { code: "18", label: "Violet / Prune" },
  { code: "19", label: "Or (métal)" },
  { code: "20", label: "Argent (métal)" },
  { code: "21", label: "Multicolore" },
  { code: "22", label: "Imprimé" },
] as const;

// ─── Reference generator ──────────────────────────────────────────────────────

function stripAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function generateReference(params: {
  name: string;
  season: string;
  year: number;
  material?: string | null;
  colorPrimary?: string | null;
}): string {
  const seasonCode: Record<string, string> = {
    "FALL-WINTER": "FW",
    "PRE-FALL": "PF",
    "SPRING-SUMMER": "SS",
    CRUISE: "CR",
    RESORT: "RS",
  };

  // Initials: first letter of each word (max 4)
  const initials = params.name
    .split(/\s+/)
    .map((w) => stripAccents(w[0] ?? "").toUpperCase())
    .filter((c) => /[A-Z]/.test(c))
    .slice(0, 4)
    .join("");

  const sea = (seasonCode[params.season] ?? "XX") + String(params.year).slice(-2);

  // Material: first 3 letters of first material, no accents
  const mat = params.material
    ? stripAccents(params.material).replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase()
    : null;

  const parts: string[] = [initials, sea];
  if (mat) parts.push(mat);
  if (params.colorPrimary) parts.push(params.colorPrimary);

  return parts.join("-");
}

// ─── SKU generator ────────────────────────────────────────────────────────────

export function generateSKU(params: {
  family: string;
  season: string;
  year: number;
  index: number;
}): string {
  const familyCode: Record<string, string> = {
    accessories: "ACC",
    "pret-a-porter": "PAP",
    shoes: "SHO",
    "leather-goods": "LG",
    "small-leather-goods": "SLG",
    jewelry: "JWL",
    fragrance: "FRG",
    other: "OTH",
  };

  const seasonCode: Record<string, string> = {
    "FALL-WINTER": "FW",
    "PRE-FALL": "PF",
    "SPRING-SUMMER": "SS",
    CRUISE: "CR",
    RESORT: "RS",
  };

  const fam = familyCode[params.family] ?? "OTH";
  const sea = seasonCode[params.season] ?? "XX";
  const yr = String(params.year).slice(-2);
  const idx = String(params.index).padStart(4, "0");

  return `${fam}-${sea}${yr}-${idx}`;
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const hasTime = hours !== 0 || minutes !== 0;
  const datePart = d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  if (!hasTime) return datePart;
  return `${datePart} ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/**
 * Escape HTML special characters to prevent XSS when interpolating
 * user-controlled data into HTML strings (e.g. server-rendered PDF reports).
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Safely parse a JSON-serialised string array from the database.
 * Returns an empty array on null, non-array, or malformed JSON — never throws.
 */
export function safeParseArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? (parsed as unknown[]).filter((v): v is string => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}

/**
 * Returns true only for image URLs from trusted origins (Vercel Blob or local uploads).
 * Prevents SSRF / XSS via user-controlled img src attributes in generated HTML.
 */
export function isTrustedImageUrl(url: string): boolean {
  if (url.startsWith("/uploads/")) return true;
  try {
    const { protocol, hostname } = new URL(url);
    return (
      protocol === "https:" &&
      (hostname.endsWith(".vercel-storage.com") ||
        hostname.endsWith(".blob.vercel-storage.com"))
    );
  } catch {
    return false;
  }
}
