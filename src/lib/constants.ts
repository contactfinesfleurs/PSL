// ─── Product families ─────────────────────────────────────────────────────────

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

// ─── Seasons ──────────────────────────────────────────────────────────────────

export const SEASONS = [
  { value: "FALL-WINTER", label: "Automne-Hiver" },
  { value: "PRE-FALL", label: "Pré-Collection" },
  { value: "SPRING-SUMMER", label: "Printemps-Été" },
  { value: "CRUISE", label: "Croisière" },
  { value: "RESORT", label: "Resort" },
] as const;

// ─── Size ranges ──────────────────────────────────────────────────────────────

export const SIZE_RANGES = [
  { value: "XS-XXL", label: "XS → XXL" },
  { value: "S-XL", label: "S → XL" },
  { value: "30-44", label: "30 → 44 (FR pantalon)" },
  { value: "35-46", label: "35 → 46 (chaussures)" },
  { value: "36-42", label: "36 → 42 (chaussures femme)" },
  { value: "ONE-SIZE", label: "Taille unique" },
  { value: "CUSTOM", label: "Personnalisé" },
] as const;

// ─── Event types ──────────────────────────────────────────────────────────────

export const EVENT_TYPES = [
  { value: "SHOW", label: "Défilé" },
  { value: "PRESENTATION", label: "Présentation" },
  { value: "LAUNCH", label: "Lancement" },
  { value: "PRESS", label: "Presse" },
  { value: "TRADE-SHOW", label: "Salon professionnel" },
  { value: "OTHER", label: "Autre" },
] as const;

// ─── Campaign types ───────────────────────────────────────────────────────────

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
