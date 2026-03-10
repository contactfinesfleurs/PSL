#!/usr/bin/env npx tsx
/**
 * CLI — PSL Multi-Agent Runner
 *
 * Usage :
 *   npx tsx scripts/run-agents.ts
 *   npx tsx scripts/run-agents.ts --no-code        # Sans l'Agent Code
 *   npx tsx scripts/run-agents.ts --security-only  # Agent Sécurité uniquement
 *   npx tsx scripts/run-agents.ts --design-only    # Agent Design uniquement
 *   npx tsx scripts/run-agents.ts --output ./out   # Dossier de sortie personnalisé
 *
 * Variables d'environnement :
 *   ANTHROPIC_API_KEY  — Clé API Anthropic (obligatoire)
 */

import * as path from "path";
import { runOrchestrator } from "../src/agents/orchestrator";
import { runSecurityAgent } from "../src/agents/securityAgent";
import { runDesignAgent } from "../src/agents/designAgent";
import { runCodeAgent } from "../src/agents/codeAgent";
import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";

// ─── Parse CLI args ────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const noCode = args.includes("--no-code");
const securityOnly = args.includes("--security-only");
const designOnly = args.includes("--design-only");
const outputIdx = args.indexOf("--output");
const outputDir = outputIdx !== -1 ? args[outputIdx + 1] : undefined;

// ─── Validate environment ──────────────────────────────────────────────────

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("\n[ERREUR] La variable ANTHROPIC_API_KEY n'est pas définie.");
  console.error("Ajoutez-la dans votre .env.local ou exportez-la :");
  console.error("  export ANTHROPIC_API_KEY=sk-ant-...\n");
  process.exit(1);
}

const projectRoot = path.resolve(__dirname, "..");
const reportsDir = outputDir ?? path.join(projectRoot, "reports");

// ─── Run ───────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  // Mode agents individuels
  if (securityOnly || designOnly) {
    const client = new Anthropic();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

    if (securityOnly) {
      console.log("\n[Mode] Agent Sécurité uniquement");
      const result = await runSecurityAgent(client, projectRoot);
      const reportPath = path.join(reportsDir, `security-report-${timestamp}.md`);
      fs.writeFileSync(reportPath, result.report, "utf-8");
      console.log(`\nRapport sauvegardé : ${reportPath}`);
    }

    if (designOnly) {
      console.log("\n[Mode] Agent Design uniquement");
      const result = await runDesignAgent(client, projectRoot);
      const reportPath = path.join(reportsDir, `design-report-${timestamp}.md`);
      fs.writeFileSync(reportPath, result.report, "utf-8");
      console.log(`\nRapport sauvegardé : ${reportPath}`);
    }

    return;
  }

  // Mode orchestrateur complet (défaut)
  await runOrchestrator({
    projectRoot,
    runCodeAgent: !noCode,
    outputDir: reportsDir,
  });
}

main().catch((err) => {
  console.error("\n[ERREUR FATALE]", err instanceof Error ? err.message : err);
  process.exit(1);
});
