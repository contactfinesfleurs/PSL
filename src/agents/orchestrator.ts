/**
 * PSL Multi-Agent Orchestrator
 *
 * Lance l'Agent Sécurité (src/app/api, middleware) et l'Agent Design (src/components)
 * EN PARALLÈLE via Promise.all, puis alimente l'Agent Code avec les résultats combinés.
 *
 * Architecture :
 *   ┌──────────────────┐    ┌──────────────────┐
 *   │  Agent Sécurité  │    │   Agent Design   │   ← exécution PARALLÈLE
 *   │  (cybersecurity) │    │   (UI/UX mode)   │
 *   └────────┬─────────┘    └────────┬─────────┘
 *            │                       │
 *            └──────────┬────────────┘
 *                       ▼
 *              ┌─────────────────┐
 *              │   Agent Code    │   ← reçoit les findings des 2 agents
 *              │ (Next.js/Prisma)│
 *              └────────┬────────┘
 *                       ▼
 *              Rapport consolidé (Markdown + JSON)
 */

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import type { OrchestratorResult, AgentResult } from "./types";
import { runSecurityAgent } from "./securityAgent";
import { runDesignAgent } from "./designAgent";
import { runCodeAgent } from "./codeAgent";

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function buildSynthesis(results: AgentResult[]): string {
  const security = results.find((r) => r.role === "security");
  const design = results.find((r) => r.role === "design");
  const code = results.find((r) => r.role === "code");

  const allFindings = results.flatMap((r) => r.findings);
  const critical = allFindings.filter((f) => f.severity === "critical");
  const high = allFindings.filter((f) => f.severity === "high");

  const lines: string[] = [
    "# Rapport PSL — Analyse Multi-Agents",
    "",
    `**Date** : ${new Date().toLocaleDateString("fr-FR", { dateStyle: "full" })}  `,
    `**Agents** : ${results.map((r) => r.name).join(", ")}  `,
    `**Findings totaux** : ${allFindings.length} (${critical.length} critiques, ${high.length} élevés)`,
    "",
    "---",
    "",
  ];

  if (critical.length > 0) {
    lines.push("## ⛔ Points Critiques à Traiter en Priorité", "");
    for (const f of critical) {
      lines.push(`- **[${f.category.toUpperCase()}]** ${f.title}${f.file ? ` — \`${f.file}\`` : ""}`);
    }
    lines.push("");
  }

  if (security) {
    lines.push(
      "## Sécurité",
      "",
      security.report,
      "",
      `*Durée : ${formatDuration(security.durationMs)} | Tokens : ${security.inputTokens} in / ${security.outputTokens} out*`,
      "",
      "---",
      ""
    );
  }

  if (design) {
    lines.push(
      "## Design & UX",
      "",
      design.report,
      "",
      `*Durée : ${formatDuration(design.durationMs)} | Tokens : ${design.inputTokens} in / ${design.outputTokens} out*`,
      "",
      "---",
      ""
    );
  }

  if (code) {
    lines.push(
      "## Code & Architecture",
      "",
      code.report,
      "",
      `*Durée : ${formatDuration(code.durationMs)} | Tokens : ${code.inputTokens} in / ${code.outputTokens} out*`,
      "",
      "---",
      ""
    );
  }

  return lines.join("\n");
}

export interface OrchestratorOptions {
  /** Project root directory */
  projectRoot: string;
  /** Whether to run the Code Agent after Security + Design */
  runCodeAgent?: boolean;
  /** Output directory for reports */
  outputDir?: string;
  /** Anthropic API key (defaults to ANTHROPIC_API_KEY env var) */
  apiKey?: string;
}

export async function runOrchestrator(
  options: OrchestratorOptions
): Promise<OrchestratorResult> {
  const {
    projectRoot,
    runCodeAgent: shouldRunCodeAgent = true,
    outputDir = path.join(projectRoot, "reports"),
    apiKey,
  } = options;

  const client = new Anthropic({ apiKey, timeout: 10 * 60 * 1000 });
  const globalStart = Date.now();

  console.log("\n╔════════════════════════════════════════╗");
  console.log("║     PSL Multi-Agent Orchestrator       ║");
  console.log("╚════════════════════════════════════════╝");
  console.log(`\nProjet : ${projectRoot}`);
  console.log(
    `Mode   : Sécurité + Design en parallèle${shouldRunCodeAgent ? " → Code" : ""}\n`
  );

  // ─── Phase 1 : Agents Sécurité et Design en PARALLÈLE ───────────────────
  console.log("Phase 1 — Lancement parallèle : Agent Sécurité + Agent Design");

  const [securityResult, designResult] = await Promise.all([
    runSecurityAgent(client, projectRoot),
    runDesignAgent(client, projectRoot),
  ]);

  console.log(
    `\nPhase 1 terminée — Sécurité: ${formatDuration(securityResult.durationMs)}, Design: ${formatDuration(designResult.durationMs)}`
  );

  const agents: AgentResult[] = [securityResult, designResult];

  // ─── Phase 2 : Agent Code (séquentiel, reçoit les findings) ─────────────
  if (shouldRunCodeAgent) {
    console.log("\nPhase 2 — Agent Code (avec contexte des phases 1)");

    const securitySummary = securityResult.findings
      .slice(0, 10)
      .map((f) => `- [${f.severity.toUpperCase()}] ${f.title}${f.file ? ` (${f.file})` : ""}`)
      .join("\n");

    const designSummary = designResult.findings
      .slice(0, 10)
      .map((f) => `- [${f.severity.toUpperCase()}] ${f.title}${f.file ? ` (${f.file})` : ""}`)
      .join("\n");

    const codeResult = await runCodeAgent(
      client,
      projectRoot,
      securitySummary || undefined,
      designSummary || undefined
    );

    agents.push(codeResult);
    console.log(`\nPhase 2 terminée — Code: ${formatDuration(codeResult.durationMs)}`);
  }

  // ─── Synthèse finale ─────────────────────────────────────────────────────
  const synthesis = buildSynthesis(agents);
  const totalDurationMs = Date.now() - globalStart;

  const result: OrchestratorResult = {
    timestamp: new Date().toISOString(),
    projectName: "PSL — Paris Style Lab",
    agents,
    synthesis,
    totalDurationMs,
  };

  // ─── Sauvegarde des rapports ──────────────────────────────────────────────
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Include milliseconds to avoid filename collision when two reports are generated within the same second
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 23);
  const reportPath = path.join(outputDir, `psl-report-${timestamp}.md`);
  const jsonPath = path.join(outputDir, `psl-report-${timestamp}.json`);

  fs.writeFileSync(reportPath, synthesis, "utf-8");
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        ...result,
        agents: result.agents.map((a) => ({
          ...a,
          report: `[${a.report.length} chars — voir le rapport Markdown]`,
        })),
      },
      null,
      2
    ),
    "utf-8"
  );

  console.log("\n╔════════════════════════════════════════╗");
  console.log("║         Analyse complète !             ║");
  console.log("╚════════════════════════════════════════╝");
  console.log(`\nDurée totale : ${formatDuration(totalDurationMs)}`);
  console.log(`Rapport Markdown : ${reportPath}`);
  console.log(`Rapport JSON     : ${jsonPath}`);

  const allFindings = agents.flatMap((a) => a.findings);
  const bySeverity = {
    critical: allFindings.filter((f) => f.severity === "critical").length,
    high: allFindings.filter((f) => f.severity === "high").length,
    medium: allFindings.filter((f) => f.severity === "medium").length,
    low: allFindings.filter((f) => f.severity === "low").length,
    info: allFindings.filter((f) => f.severity === "info").length,
  };

  console.log(
    `\nFindings : ${allFindings.length} total` +
      (bySeverity.critical ? ` | ⛔ ${bySeverity.critical} critiques` : "") +
      (bySeverity.high ? ` | 🔴 ${bySeverity.high} élevés` : "") +
      (bySeverity.medium ? ` | 🟠 ${bySeverity.medium} moyens` : "") +
      (bySeverity.low ? ` | 🟡 ${bySeverity.low} faibles` : "") +
      (bySeverity.info ? ` | ℹ️ ${bySeverity.info} info` : "")
  );

  return result;
}
