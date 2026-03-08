/**
 * Design Agent — Expert UI/UX Fashion Luxury
 * Analyse: composants visuels, accessibilité, cohérence design system, UX mode
 */

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import type { AgentConfig, AgentResult, Finding } from "./types";

export const DESIGN_AGENT_CONFIG: AgentConfig = {
  role: "design",
  name: "Agent Design",
  systemPrompt: `Tu es un expert en UI/UX spécialisé dans le secteur de la mode et du luxe, avec une maîtrise de React 19, Next.js 15, TailwindCSS et des design systems haut de gamme.

Ton rôle EXCLUSIF est d'analyser les composants visuels de l'application PSL (Paris Style Lab) — un PLM/outil de gestion pour maison de couture.

## Périmètre d'analyse

Concentre-toi UNIQUEMENT sur :
1. **Cohérence du design system** — palette de couleurs, typographie, spacing, tokens de design
2. **Composants UI** — qualité, réutilisabilité, accessibilité (ARIA, focus, contraste), responsive
3. **UX Mode & Luxe** — l'interface reflète-t-elle les codes du luxe ? Images produits, fiches techniques
4. **Performance visuelle** — images optimisées, lazy loading, skeleton loading, états de chargement
5. **Navigation & Information Architecture** — sidebar, breadcrumbs, flux utilisateur pour un styliste/directeur artistique
6. **Formulaires & Interactions** — upload photos, saisie de données produit, feedback utilisateur
7. **Opportunités d'amélioration** — suggestions concrètes d'amélioration UX pour le secteur mode

## Format de sortie

Retourne un rapport Markdown structuré avec :
- Un résumé exécutif (2-3 phrases)
- Analyse par composant avec captures du code concerné
- Findings classés par priorité (HIGH / MEDIUM / LOW / ENHANCEMENT)
- Un bloc JSON à la fin :

\`\`\`json
{
  "findings": [
    {
      "severity": "high|medium|low|info",
      "category": "design-system|accessibility|ux|performance|navigation|forms",
      "title": "...",
      "description": "...",
      "file": "src/components/...",
      "recommendation": "..."
    }
  ]
}
\`\`\`

Sois inspirant et précis. Pense aux besoins d'un directeur artistique ou d'un chef de produit dans une maison de couture.`,
  scope: ["src/components", "src/app"],
};

function collectFiles(dir: string, root: string, extensions = [".tsx", ".ts"]): string[] {
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

function buildDesignContext(projectRoot: string): string {
  const sections: string[] = [];

  // All component files
  const componentsDir = path.join(projectRoot, "src/components");
  const componentFiles = collectFiles(componentsDir, projectRoot);
  for (const file of componentFiles) {
    const content = fs.readFileSync(path.join(projectRoot, file), "utf-8");
    sections.push(`### ${file}\n\`\`\`tsx\n${content}\n\`\`\``);
  }

  // App pages (layout + page files — not API routes)
  const appDir = path.join(projectRoot, "src/app");
  const pageFiles = collectFiles(appDir, projectRoot).filter(
    (f) =>
      !f.includes("/api/") &&
      (f.endsWith("page.tsx") || f.endsWith("layout.tsx") || f.endsWith("page.ts"))
  );
  for (const file of pageFiles) {
    const content = fs.readFileSync(path.join(projectRoot, file), "utf-8");
    sections.push(`### ${file}\n\`\`\`tsx\n${content}\n\`\`\``);
  }

  // Global CSS / Tailwind config
  for (const cssFile of ["src/app/globals.css", "tailwind.config.ts", "tailwind.config.js"]) {
    const filePath = path.join(projectRoot, cssFile);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      const ext = path.extname(cssFile).slice(1);
      sections.push(`### ${cssFile}\n\`\`\`${ext}\n${content}\n\`\`\``);
    }
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

export async function runDesignAgent(
  client: Anthropic,
  projectRoot: string
): Promise<AgentResult> {
  const start = Date.now();
  const context = buildDesignContext(projectRoot);

  const userMessage = `Analyse les composants UI/UX de cette application Next.js 15 (PSL — Paris Style Lab), un outil PLM pour une maison de couture.

Voici le code source complet des composants dans ton périmètre :

${context}

---

Produis ton rapport design/UX complet.`;

  const stream = client.messages.stream({
    model: "claude-opus-4-6",
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    system: DESIGN_AGENT_CONFIG.systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  process.stdout.write(`\n[${DESIGN_AGENT_CONFIG.name}] Analyse en cours`);

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
    role: "design",
    name: DESIGN_AGENT_CONFIG.name,
    report,
    findings: extractFindings(report),
    durationMs: Date.now() - start,
    inputTokens: finalMessage.usage.input_tokens,
    outputTokens: finalMessage.usage.output_tokens,
  };
}
