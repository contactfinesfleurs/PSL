/**
 * Shared types for the PSL multi-agent orchestrator.
 */

export type AgentRole = "security" | "design" | "code";

export interface AgentConfig {
  role: AgentRole;
  name: string;
  systemPrompt: string;
  /** Directories / files this agent focuses on */
  scope: string[];
}

export interface AgentResult {
  role: AgentRole;
  name: string;
  /** Raw markdown report from the agent */
  report: string;
  /** Structured findings extracted by the agent */
  findings: Finding[];
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
}

export interface Finding {
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: string;
  title: string;
  description: string;
  file?: string;
  recommendation?: string;
}

export interface OrchestratorResult {
  timestamp: string;
  projectName: string;
  agents: AgentResult[];
  /** Combined synthesis produced after all agents finish */
  synthesis: string;
  totalDurationMs: number;
}
