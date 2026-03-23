/**
 * Code Agent — Expert Next.js / Prisma / TypeScript
 * Implémente les features demandées en s'inspirant des patterns PLM (events & collections)
 */

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import type { AgentConfig, AgentResult } from "./types";
import {
  sanitizeFileContent,
  wrapUntrustedFile,
  extractAndValidateFindings,
  logInjectionAttempts,
  logContextStats,
  ANTI_INJECTION_SYSTEM_SUFFIX,
} from "./promptSecurity";

export const CODE_AGENT_CONFIG: AgentConfig = {
  role: "code",
  name: "Agent Code",
  systemPrompt: `Tu es un expert en développement Next.js 15 (App Router), TypeScript strict, Prisma ORM et React 19.

Ton rôle est d'analyser le code de l'application PSL (Paris Style Lab) — un système PLM/gestion pour maison de couture — et de proposer des implémentations concrètes de nouvelles features.

## Contexte domaine

PSL est un logiciel de gestion de mode qui gère :
- **Produits** (SKU, collections, saisons, fiches techniques / tech packs)
- **Échantillons** (photos, revues, couleurs finales, matières)
- **Événements** (défilés, présentations, lancements, presse)
- **Campagnes** (digital, print, social, influenceurs, budget)

## Périmètre d'analyse

Analyse le code existant et fournis :
1. **Qualité du code** — typage TypeScript, patterns Next.js 15, gestion d'erreurs, async/await
2. **Architecture Prisma** — schéma de données, relations, optimisations N+1, transactions
3. **API Routes** — RESTful design, validation, pagination, filtres
4. **Opportunités de features** — fonctionnalités manquantes utiles pour un PLM mode
5. **Performance** — Server Components vs Client Components, data fetching, caching

## Features à implémenter (priorités)

Propose des implémentations concrètes pour :
- **Timeline des événements** : vue calendrier des shows/présentations avec les produits associés
- **Lookbook generator** : sélection de produits/samples et génération PDF lookbook
- **Dashboard analytique** : statistiques collections (nb produits par famille, statut, saison)
- **Workflow statut produit** : transitions d'état (Draft → Sampling → Production → Launch)

## Format de sortie

Retourne un rapport Markdown structuré avec :
- Analyse de la qualité du code actuel
- Findings techniques classés par priorité
- Code d'implémentation pour les features prioritaires
- Un bloc JSON à la fin :

\`\`\`json
{
  "findings": [
    {
      "severity": "high|medium|low|info",
      "category": "architecture|performance|feature|quality|database",
      "title": "...",
      "description": "...",
      "file": "src/...",
      "recommendation": "..."
    }
  ]
}
\`\`\`

Fournis du code TypeScript complet, compilable et prêt à l'emploi. Utilise les patterns du projet existant.${ANTI_INJECTION_SYSTEM_SUFFIX}`,
  scope: ["src/app", "src/lib", "prisma"],
};

function collectFiles(
  dir: string,
  root: string,
  extensions = [".ts", ".tsx", ".prisma"]
): string[] {
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

function buildCodeContext(projectRoot: string): string {
  const sections: string[] = [];
  let totalBytes = 0;
  let truncatedCount = 0;
  let suspiciousCount = 0;

  function processFile(relPath: string): void {
    const absPath = path.join(projectRoot, relPath);
    const raw = fs.readFileSync(absPath, "utf-8");
    const { content, suspiciousPatterns, wasTruncated } = sanitizeFileContent(raw);

    totalBytes += raw.length;
    if (wasTruncated) truncatedCount++;
    if (suspiciousPatterns.length > 0) {
      suspiciousCount++;
      logInjectionAttempts(CODE_AGENT_CONFIG.name, relPath, suspiciousPatterns);
    }

    sections.push(wrapUntrustedFile(relPath, content));
  }

  // Prisma schema
  const prismaSchema = "prisma/schema.prisma";
  if (fs.existsSync(path.join(projectRoot, prismaSchema))) processFile(prismaSchema);

  // API routes
  const apiDir = path.join(projectRoot, "src/app/api");
  for (const file of collectFiles(apiDir, projectRoot, [".ts"])) processFile(file);

  // Lib utilities
  const libDir = path.join(projectRoot, "src/lib");
  for (const file of collectFiles(libDir, projectRoot, [".ts"])) processFile(file);

  // Package.json for dependencies context
  const pkgPath = "package.json";
  if (fs.existsSync(path.join(projectRoot, pkgPath))) processFile(pkgPath);

  logContextStats(
    CODE_AGENT_CONFIG.name,
    sections.length,
    totalBytes,
    truncatedCount,
    suspiciousCount
  );

  return sections.join("\n\n");
}

export async function runCodeAgent(
  client: Anthropic,
  projectRoot: string,
  securityFindings?: string,
  designFindings?: string
): Promise<AgentResult> {
  // Validate projectRoot to prevent reading arbitrary filesystem paths
  if (!projectRoot || !fs.existsSync(projectRoot) || !fs.statSync(projectRoot).isDirectory()) {
    throw new Error(`Invalid projectRoot: "${projectRoot}"`);
  }

  const start = Date.now();
  const context = buildCodeContext(projectRoot);

  const contextSection =
    securityFindings || designFindings
      ? `\n\n## Contexte des autres agents\n\n${
          securityFindings
            ? `### Findings de l'Agent Sécurité\n${securityFindings}\n`
            : ""
        }${
          designFindings
            ? `### Findings de l'Agent Design\n${designFindings}\n`
            : ""
        }`
      : "";

  const userMessage = `Analyse le code de l'application PSL (Paris Style Lab) et propose des implémentations concrètes.${contextSection}

Voici le code source dans ton périmètre :

${context}

---

Produis ton rapport technique complet avec du code d'implémentation prêt à l'emploi.`;

  const stream = client.messages.stream(
    {
      model: "claude-sonnet-4-6",
      max_tokens: 12000,
      thinking: { type: "adaptive" },
      system: CODE_AGENT_CONFIG.systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    },
    { signal: AbortSignal.timeout(8 * 60 * 1000) } // 8 min max
  );

  process.stdout.write(`\n[${CODE_AGENT_CONFIG.name}] Analyse en cours`);

  let report = "";
  try {
    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        report += event.delta.text;
        process.stdout.write(".");
      }
    }
  } catch (e) {
    if (e instanceof Error && e.name === "TimeoutError") {
      throw new Error(`[${CODE_AGENT_CONFIG.name}] Timeout après 8 minutes`);
    }
    throw e;
  }

  const finalMessage = await stream.finalMessage();
  process.stdout.write(" ✓\n");

  return {
    role: "code",
    name: CODE_AGENT_CONFIG.name,
    report,
    findings: extractAndValidateFindings(report),
    durationMs: Date.now() - start,
    inputTokens: finalMessage.usage.input_tokens,
    outputTokens: finalMessage.usage.output_tokens,
  };
}
