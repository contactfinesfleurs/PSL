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
