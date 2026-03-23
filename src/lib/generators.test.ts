import { describe, it, expect } from "vitest";
import { generateSKU, generateReference } from "./generators";

// stripAccents is not exported — test it indirectly via generateReference
describe("stripAccents (via generateReference)", () => {
  it("strips French accents from product name initials", () => {
    const ref = generateReference({ name: "Écharpe Ébène", season: "FALL-WINTER", year: 2024 });
    // Initials should be "EE" (É → E, Ê → E), not contain accent characters
    expect(ref).toMatch(/^EE-/);
  });

  it("strips à, ü, ç from material", () => {
    const ref = generateReference({
      name: "Veste",
      season: "SPRING-SUMMER",
      year: 2025,
      material: "çuir",
    });
    // material part: "çuir" → "cuir" → "CUI"
    expect(ref).toContain("CUI");
  });

  it("handles all-uppercase name without accents", () => {
    const ref = generateReference({ name: "BLAZER", season: "CRUISE", year: 2024 });
    expect(ref).toMatch(/^B-CR24$/);
  });

  it("handles empty string gracefully (no initials)", () => {
    const ref = generateReference({ name: "   ", season: "RESORT", year: 2024 });
    // No letters in name → empty initials → parts = ["", "RS24"] → joined with "-"
    expect(ref).toBe("-RS24");
  });
});

describe("generateSKU", () => {
  it("generates correct SKU for pret-a-porter / FALL-WINTER", () => {
    expect(generateSKU({ family: "pret-a-porter", season: "FALL-WINTER", year: 2024, index: 1 })).toBe("PAP-FW24-0001");
  });

  it("generates correct SKU for accessories / SPRING-SUMMER", () => {
    expect(generateSKU({ family: "accessories", season: "SPRING-SUMMER", year: 2025, index: 42 })).toBe("ACC-SS25-0042");
  });

  it("generates correct SKU for shoes / PRE-FALL", () => {
    expect(generateSKU({ family: "shoes", season: "PRE-FALL", year: 2023, index: 999 })).toBe("SHO-PF23-0999");
  });

  it("pads index to 4 digits", () => {
    expect(generateSKU({ family: "jewelry", season: "CRUISE", year: 2024, index: 1 })).toBe("JWL-CR24-0001");
    expect(generateSKU({ family: "jewelry", season: "CRUISE", year: 2024, index: 9999 })).toBe("JWL-CR24-9999");
  });

  it("falls back to OTH for unknown family", () => {
    expect(generateSKU({ family: "unknown-category", season: "RESORT", year: 2024, index: 5 })).toBe("OTH-RS24-0005");
  });

  it("falls back to XX for unknown season", () => {
    expect(generateSKU({ family: "fragrance", season: "UNKNOWN", year: 2024, index: 1 })).toBe("FRG-XX24-0001");
  });

  it("uses last 2 digits of year", () => {
    expect(generateSKU({ family: "other", season: "FALL-WINTER", year: 2030, index: 1 })).toBe("OTH-FW30-0001");
  });
});

describe("generateReference", () => {
  it("generates reference with material and color", () => {
    const ref = generateReference({
      name: "Blazer Sport",
      season: "FALL-WINTER",
      year: 2024,
      material: "Cotton",
      colorPrimary: "02",
    });
    expect(ref).toBe("BS-FW24-COT-02");
  });

  it("generates reference without optional fields", () => {
    const ref = generateReference({ name: "Robe", season: "SPRING-SUMMER", year: 2025 });
    expect(ref).toBe("R-SS25");
  });

  it("takes at most 4 initials", () => {
    const ref = generateReference({
      name: "Alpha Beta Gamma Delta Epsilon",
      season: "CRUISE",
      year: 2024,
    });
    expect(ref).toMatch(/^ABGD-/);
  });

  it("uses XX for unknown season", () => {
    const ref = generateReference({ name: "Test", season: "UNKNOWN", year: 2024 });
    expect(ref).toBe("T-XX24");
  });

  it("strips special chars from material (keeps only letters)", () => {
    const ref = generateReference({
      name: "Veste",
      season: "FALL-WINTER",
      year: 2024,
      material: "100% Wool",
    });
    // "100% Wool" → remove non-alpha → "Wool" → slice(0,3) → "Woo" → upper → "WOO"
    expect(ref).toContain("WOO");
  });
});
