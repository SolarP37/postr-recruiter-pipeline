import type { AgentExecutionResult, AgentLogger, AgentTask } from "@/lib/agents/types";
import type { BaseAgent } from "@/lib/agents/base-agent";
import type { AgentRuntimeServices } from "@/lib/agents/runtime-services";
import { parseAgentTask } from "@/lib/agents/task-contracts";
import {
  AnalyticsAgent,
  BrandDiscoveryAgent,
  CreatorDiscoveryAgent,
  CreatorQualificationAgent,
  CreatorResearchAgent,
  EmailGenerationAgent,
  FollowupAgent,
  createInitialAgents,
} from "@/lib/agents/shells";

class OperationalCreatorDiscoveryAgent extends CreatorDiscoveryAgent {
  constructor(logger: AgentLogger, private readonly runtime: AgentRuntimeServices) { super(logger); }
  async execute(task: AgentTask): Promise<AgentExecutionResult> {
    const input = parseAgentTask(task, "discovery.search");
    return { taskId: task.id, output: await this.runtime.discover(input.query, input.limit) };
  }
}

class OperationalCreatorResearchAgent extends CreatorResearchAgent {
  constructor(logger: AgentLogger, private readonly runtime: AgentRuntimeServices) { super(logger); }
  async execute(task: AgentTask): Promise<AgentExecutionResult> {
    if (task.type === "research.inspect") {
      const input = parseAgentTask(task, "research.inspect");
      return { taskId: task.id, output: await this.runtime.inspectResearchUrl(input.url) };
    }
    const input = parseAgentTask(task, "research.apify_dataset");
    return { taskId: task.id, output: await this.runtime.readApifyDataset(input.limit) };
  }
}

class OperationalBrandDiscoveryAgent extends BrandDiscoveryAgent {
  constructor(logger: AgentLogger, private readonly runtime: AgentRuntimeServices) { super(logger); }
  async execute(task: AgentTask): Promise<AgentExecutionResult> {
    const input = parseAgentTask(task, "brand.discovery.search");
    return { taskId: task.id, output: await this.runtime.discoverBrands(input.query, input.limit) };
  }
}

class OperationalCreatorQualificationAgent extends CreatorQualificationAgent {
  constructor(logger: AgentLogger, private readonly runtime: AgentRuntimeServices) { super(logger); }
  async execute(task: AgentTask): Promise<AgentExecutionResult> {
    const input = parseAgentTask(task, "qualification.evaluate");
    return { taskId: task.id, output: await this.runtime.evaluateQualification(input.prospectId) };
  }
}

class OperationalEmailGenerationAgent extends EmailGenerationAgent {
  constructor(logger: AgentLogger, private readonly runtime: AgentRuntimeServices) { super(logger); }
  async execute(task: AgentTask): Promise<AgentExecutionResult> {
    if (task.type === "autonomy.evaluate") {
      const input = parseAgentTask(task, "autonomy.evaluate");
      return { taskId: task.id, output: await this.runtime.evaluateAutonomy(input.messageId, input.action) };
    }
    const input = parseAgentTask(task, "outreach.prepare");
    return { taskId: task.id, output: await this.runtime.prepareOutreach(input.prospectId) };
  }
}

class OperationalAnalyticsAgent extends AnalyticsAgent {
  constructor(logger: AgentLogger, private readonly runtime: AgentRuntimeServices) { super(logger); }
  async execute(task: AgentTask): Promise<AgentExecutionResult> {
    parseAgentTask(task, "analytics.snapshot");
    return { taskId: task.id, output: await this.runtime.analyticsSnapshot() };
  }
}

class OperationalFollowupAgent extends FollowupAgent {
  constructor(logger: AgentLogger, private readonly runtime: AgentRuntimeServices) { super(logger); }
  async execute(task: AgentTask): Promise<AgentExecutionResult> {
    const input = parseAgentTask(task, "followup.prepare");
    return { taskId: task.id, output: await this.runtime.prepareFollowUp(input.prospectId) };
  }
}

export function createOperationalAgents(logger: AgentLogger, runtime: AgentRuntimeServices) {
  const connected = new Map<string, BaseAgent>([
    ["creator-discovery", new OperationalCreatorDiscoveryAgent(logger, runtime)],
    ["creator-research", new OperationalCreatorResearchAgent(logger, runtime)],
    ["brand-discovery", new OperationalBrandDiscoveryAgent(logger, runtime)],
    ["creator-qualification", new OperationalCreatorQualificationAgent(logger, runtime)],
    ["email-generation", new OperationalEmailGenerationAgent(logger, runtime)],
    ["followup", new OperationalFollowupAgent(logger, runtime)],
    ["analytics", new OperationalAnalyticsAgent(logger, runtime)],
  ]);
  return createInitialAgents(logger).map((agent) => connected.get(agent.id) ?? agent);
}
