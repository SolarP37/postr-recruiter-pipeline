import type { AgentExecutionResult, AgentLogger, AgentTask } from "@/lib/agents/types";
import type { BaseAgent } from "@/lib/agents/base-agent";
import type { AgentRuntimeServices } from "@/lib/agents/runtime-services";
import { parseAgentTask } from "@/lib/agents/task-contracts";
import {
  AnalyticsAgent,
  CreatorQualificationAgent,
  EmailGenerationAgent,
  createInitialAgents,
} from "@/lib/agents/shells";

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

export function createOperationalAgents(logger: AgentLogger, runtime: AgentRuntimeServices) {
  const connected = new Map<string, BaseAgent>([
    ["creator-qualification", new OperationalCreatorQualificationAgent(logger, runtime)],
    ["email-generation", new OperationalEmailGenerationAgent(logger, runtime)],
    ["analytics", new OperationalAnalyticsAgent(logger, runtime)],
  ]);
  return createInitialAgents(logger).map((agent) => connected.get(agent.id) ?? agent);
}
