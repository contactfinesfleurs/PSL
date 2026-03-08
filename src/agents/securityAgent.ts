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
  systemPrompt: `Tu es un expert en cybersécurité spécialisé dans les applications Next.js 15 (App Router), TypeScript, Prisma ORM et les API REST.

Ton rôle EXCLUSIF est d'analyser la sécurité de l'application PSL (Paris Style Lab) — un système de gestion mode/PLM.

## Périmètre d'analyse

Concentre-toi UNIQUEMENT sur :
1. **Authentification & Autorisation** — absence d'auth, routes non protégées, accès non contrôlé
2. **Validation des entrées** — injection SQL via Prisma, validation des paramètres d'URL, body parsing
3. **API Routes** — méthodes HTTP exposées, gestion d'erreurs, fuite d'infos sensibles dans les réponses
4. **Upload de fichiers** — validation MIME type, taille, path traversal, stockage sécurisé
5. **Variables d'environnement** — secrets exposés côté client, .env committé
6. **Headers de sécurité** — CORS, CSP, HSTS dans next.config.js
7. **Gestion des erreurs** — stack traces exposés, messages d'erreur trop verbeux

## Format de sortie

Retourne un rapport Markdown structuré avec :
- Un résumé exécutif (2-3 phrases)
- Une liste de findings classés par sévérité (CRITICAL / HIGH / MEDIUM / LOW / INFO)
- Pour chaque finding : titre, fichier concerné, description, recommandation concrète
- Un bloc JSON à la fin avec les findings structurés :

\`\`\`json
{
  "findings": [
    {
      "severity": "critical|high|medium|low|info",
      "category": "auth|validation|api|upload|secrets|headers|errors",
      "title": "...",
      "description": "...",
      "file": "src/...",
      "recommendation": "..."
    }
  ]
}
\`\`\`

Sois précis, factuel et actionnable. Cite les fichiers et lignes de code concernées.`,
  scope: [
    "src/app/api",
    "src/app",
    "src/lib",
    "src/middleware.ts",
    "next.config.ts",
    "next.config.js",
  ],
};

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

  // Collect API routes
  const apiDir = path.join(projectRoot, "src/app/api");
  const apiFiles = collectFiles(apiDir, projectRoot);
  for (const file of apiFiles) {
    const content = fs.readFileSync(path.join(projectRoot, file), "utf-8");
    sections.push(`### ${file}\n\`\`\`typescript\n${content}\n\`\`\``);
  }

  // Collect next.config and middleware if they exist
  for (const configFile of ["next.config.ts", "next.config.js", "src/middleware.ts", "middleware.ts"]) {
    const filePath = path.join(projectRoot, configFile);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      sections.push(`### ${configFile}\n\`\`\`typescript\n${content}\n\`\`\``);
    }
  }

  // Collect lib utilities
  const libDir = path.join(projectRoot, "src/lib");
  const libFiles = collectFiles(libDir, projectRoot);
  for (const file of libFiles) {
    const content = fs.readFileSync(path.join(projectRoot, file), "utf-8");
    sections.push(`### ${file}\n\`\`\`typescript\n${content}\n\`\`\``);
  }

  // Collect page-level files (layouts, pages with potential server actions)
  const appDir = path.join(projectRoot, "src/app");
  const appFiles = collectFiles(appDir, projectRoot).filter(
    (f) => !f.includes("/api/") && (f.endsWith("page.tsx") || f.endsWith("layout.tsx"))
  );
  for (const file of appFiles.slice(0, 5)) {
    const content = fs.readFileSync(path.join(projectRoot, file), "utf-8");
    sections.push(`### ${file}\n\`\`\`typescript\n${content}\n\`\`\``);
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
