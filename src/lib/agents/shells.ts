import { BaseAgent } from "@/lib/agents/base-agent";
import type { AgentExecutionResult, AgentLogger, AgentTask } from "@/lib/agents/types";

abstract class AgentShell extends BaseAgent {
  async execute(task: AgentTask): Promise<AgentExecutionResult> {
    return { taskId: task.id, output: { status: "placeholder" } };
  }
}

export class CreatorDiscoveryAgent extends AgentShell {
  constructor(logger: AgentLogger) { super("creator-discovery", "Creator Discovery Agent", "Discovers creator prospects.", logger); }
}
export class CreatorQualificationAgent extends AgentShell {
  constructor(logger: AgentLogger) { super("creator-qualification", "Creator Qualification Agent", "Qualifies creator prospects.", logger); }
}
export class CreatorResearchAgent extends AgentShell {
  constructor(logger: AgentLogger) { super("creator-research", "Creator Research Agent", "Researches creator context.", logger); }
}
export class BrandDiscoveryAgent extends AgentShell {
  constructor(logger: AgentLogger) { super("brand-discovery", "Brand Discovery Agent", "Discovers brand prospects.", logger); }
}
export class CRMUpdateAgent extends AgentShell {
  constructor(logger: AgentLogger) { super("crm-update", "CRM Update Agent", "Coordinates future CRM updates.", logger); }
}
export class EmailGenerationAgent extends AgentShell {
  constructor(logger: AgentLogger) { super("email-generation", "Email Generation Agent", "Coordinates future email generation.", logger); }
}
export class FollowupAgent extends AgentShell {
  constructor(logger: AgentLogger) { super("followup", "Follow-up Agent", "Coordinates future follow-up tasks.", logger); }
}
export class AnalyticsAgent extends AgentShell {
  constructor(logger: AgentLogger) { super("analytics", "Analytics Agent", "Coordinates future analytics tasks.", logger); }
}

export function createInitialAgents(logger: AgentLogger): BaseAgent[] {
  return [
    new CreatorDiscoveryAgent(logger),
    new CreatorQualificationAgent(logger),
    new CreatorResearchAgent(logger),
    new BrandDiscoveryAgent(logger),
    new CRMUpdateAgent(logger),
    new EmailGenerationAgent(logger),
    new FollowupAgent(logger),
    new AnalyticsAgent(logger),
  ];
}
