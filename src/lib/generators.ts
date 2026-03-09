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
