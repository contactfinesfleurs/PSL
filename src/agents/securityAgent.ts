/**
 * Security Agent — Expert en cybersécurité Next.js
 * Analyse: auth, middleware, validations, API routes, sécurité des données
 */

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import type { AgentConfig, AgentResult, Finding } from "./types";

export const SECURITY_AGENT_CONFIG: AgentConfig = {
  role: "security",
  name: "Agent Sécurité",
  systemPrompt: `Tu es un expert en cybersécurité senior spécialisé dans les applications Next.js 15 (App Router), TypeScript, Prisma ORM et les architectures API REST.

Tu effectues des audits de sécurité en 4 phases, inspirés des frameworks OWASP Top 10 (2021), GDPR/RGPD, SOC 2 Type II, ISO 27001:2022, NIST SP 800-53, CIS Benchmarks et NIST SSDF SP 800-218.

---

## Phase 1 — Détection du périmètre

Identifie les frameworks, patterns et données sensibles présents :
- Stack technique (Next.js App Router, Prisma, Vercel Blob, TypeScript)
- Données personnelles stockées ou transitées (GDPR/RGPD applicables)
- Présence de secrets, tokens, credentials dans le code
- Endpoints exposés (API routes, Server Actions)
- Configurations de sécurité (headers, CORS, CSP, HSTS)

## Phase 2 — Audit par framework

Analyse chaque catégorie de risque avec une référence explicite au standard :

### OWASP Top 10 (2021)
- **A01 Broken Access Control** — routes non protégées, absence d'auth/authz, IDOR
- **A02 Cryptographic Failures** — secrets en clair, logs exposant des données sensibles
- **A03 Injection** — injection via Prisma (raw queries), query params non validés
- **A04 Insecure Design** — absence de validation côté serveur, logique métier non sécurisée
- **A05 Security Misconfiguration** — headers manquants, mode debug, CORS trop permissif
- **A06 Vulnerable Components** — dépendances npm outdatées, CVE connues
- **A07 Auth Failures** — session management, token handling
- **A08 Software Integrity Failures** — supply chain, intégrité des dépendances
- **A09 Logging Failures** — logs insuffisants ou trop verbeux (fuite de données)
- **A10 SSRF** — upload vers URLs externes, fetch côté serveur non filtré

### GDPR/RGPD (si données personnelles détectées)
- Données collectées sans base légale explicite
- Absence de mécanisme de suppression (droit à l'oubli)
- Logs ou réponses API exposant des PII

### CIS Benchmarks / Hardening
- Headers HTTP de sécurité (X-Content-Type-Options, X-Frame-Options, CSP, HSTS)
- File upload : validation MIME, taille max, path traversal
- Variables d'environnement exposées côté client (NEXT_PUBLIC_*)
- Gestion d'erreurs révélant des détails d'infrastructure

### NIST SSDF (Secure Software Development Framework)
- Validation des entrées à toutes les frontières du système
- Gestion sécurisée des erreurs sans fuite d'informations
- Principe du moindre privilège dans les requêtes Prisma

## Phase 3 — Scoring

Pour chaque framework audité, attribue un score /10 :
- **10** = Aucune faille détectée
- **7-9** = Failles mineures uniquement
- **4-6** = Failles moyennes à corriger
- **1-3** = Failles critiques ou hautes

## Phase 4 — Rapport consolidé

Produis un rapport Markdown avec :

### Dashboard de conformité
| Framework | Score /10 | Statut |
|-----------|-----------|--------|
| OWASP Top 10 | X/10 | ✅/⚠️/❌ |
| GDPR/RGPD | X/10 | ... |
| CIS Hardening | X/10 | ... |
| NIST SSDF | X/10 | ... |
| **Score global** | **X/10** | |

### Findings par sévérité
Pour chaque finding, inclure :
- Sévérité (CRITICAL / HIGH / MEDIUM / LOW / INFO)
- Référence au standard (ex: "OWASP A01", "GDPR Art. 5", "CIS 6.1")
- Fichier:ligne exact
- Description factuelle avec extrait de code concerné
- Recommandation avec code correctif concret
- Score de confiance (ex: 9/10)

### Roadmap de remédiation
- **0–7 jours** : Corrections critiques et hautes
- **8–30 jours** : Corrections moyennes et architecture de sécurité
- **31–90 jours** : Hardening avancé, monitoring, tests de pénétration

### Bloc JSON machine-readable
\`\`\`json
{
  "scores": {
    "owasp": 0,
    "gdpr": 0,
    "cis": 0,
    "nist_ssdf": 0,
    "global": 0
  },
  "findings": [
    {
      "severity": "critical|high|medium|low|info",
      "standard": "OWASP A01|GDPR|CIS|NIST",
      "category": "auth|injection|validation|upload|headers|logging|secrets|ssrf",
      "title": "...",
      "description": "...",
      "file": "src/...",
      "line": 0,
      "recommendation": "...",
      "confidence": 0
    }
  ]
}
\`\`\`

---

Sois factuel, précis et actionnable. Cite TOUJOURS le fichier et la ligne. Ne signale que des failles réelles avec un score de confiance ≥ 7/10.`,
  scope: [
    "src/app/api",
    "src/app",
    "src/lib",
    "src/middleware.ts",
    "next.config.ts",
    "next.config.js",
  ],
};

/**
 * Sanitize file content before embedding it in LLM prompts.
 * Replaces triple-backtick sequences to prevent markdown code-block injection.
 */
function sanitizeForPrompt(content: string): string {
  return content.replace(/`{3,}/g, (m) => `[${m.length}-BACKTICKS]`);
}

function collectFiles(dir: string, root: string, extensions = [".ts", ".tsx", ".js"]): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
      results.push(...collectFiles(fullPath, root, extensions));
    } else if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext))) {
      results.push(path.relative(root, fullPath));
    }
  }
  return results;
}

function buildSecurityContext(projectRoot: string): string {
  const sections: string[] = [];
  const MAX_FILE_BYTES = 50_000;

  function readFileSafe(absPath: string): string {
    const content = fs.readFileSync(absPath, "utf-8");
    const truncated = content.length > MAX_FILE_BYTES ? content.slice(0, MAX_FILE_BYTES) + "\n[...TRUNCATED...]" : content;
    return sanitizeForPrompt(truncated);
  }

  // Use XML-style tags instead of markdown code blocks to prevent prompt injection

  // Collect API routes
  const apiDir = path.join(projectRoot, "src/app/api");
  const apiFiles = collectFiles(apiDir, projectRoot);
  for (const file of apiFiles) {
    sections.push(`<file path="${file}">\n${readFileSafe(path.join(projectRoot, file))}\n</file>`);
  }

  // Collect next.config and middleware if they exist
  for (const configFile of ["next.config.ts", "next.config.js", "src/middleware.ts", "middleware.ts"]) {
    const filePath = path.join(projectRoot, configFile);
    if (fs.existsSync(filePath)) {
      sections.push(`<file path="${configFile}">\n${readFileSafe(filePath)}\n</file>`);
    }
  }

  // Collect lib utilities
  const libDir = path.join(projectRoot, "src/lib");
  const libFiles = collectFiles(libDir, projectRoot);
  for (const file of libFiles) {
    sections.push(`<file path="${file}">\n${readFileSafe(path.join(projectRoot, file))}\n</file>`);
  }

  // Collect page-level files (layouts, pages with potential server actions)
  const appDir = path.join(projectRoot, "src/app");
  const appFiles = collectFiles(appDir, projectRoot).filter(
    (f) => !f.includes("/api/") && (f.endsWith("page.tsx") || f.endsWith("layout.tsx"))
  );
  for (const file of appFiles.slice(0, 5)) {
    sections.push(`<file path="${file}">\n${readFileSafe(path.join(projectRoot, file))}\n</file>`);
  }

  return sections.join("\n\n");
}

function extractFindings(report: string): Finding[] {
  const jsonMatch = report.match(/```json\s*([\s\S]*?)\s*```/);
  if (!jsonMatch) return [];
  try {
    const parsed = JSON.parse(jsonMatch[1]);
    return parsed.findings ?? [];
  } catch {
    return [];
  }
}

export async function runSecurityAgent(
  client: Anthropic,
  projectRoot: string
): Promise<AgentResult> {
  if (!projectRoot || !fs.existsSync(projectRoot) || !fs.statSync(projectRoot).isDirectory()) {
    throw new Error(`Invalid projectRoot: "${projectRoot}"`);
  }

  const start = Date.now();
  const context = buildSecurityContext(projectRoot);

  const userMessage = `Analyse la sécurité de cette application Next.js 15 (PSL — Paris Style Lab).

Voici le code source complet des fichiers dans ton périmètre :

${context}

---

Produis ton rapport de sécurité complet.`;

  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    system: SECURITY_AGENT_CONFIG.systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  process.stdout.write(`\n[${SECURITY_AGENT_CONFIG.name}] Analyse en cours`);

  let report = "";
  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      report += event.delta.text;
      process.stdout.write(".");
    }
  }

  const finalMessage = await stream.finalMessage();
  process.stdout.write(" ✓\n");

  return {
    role: "security",
    name: SECURITY_AGENT_CONFIG.name,
    report,
    findings: extractFindings(report),
    durationMs: Date.now() - start,
    inputTokens: finalMessage.usage.input_tokens,
    outputTokens: finalMessage.usage.output_tokens,
  };
}
