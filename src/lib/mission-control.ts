import { AgentRegistry } from "@/lib/agents/registry";
import { PrismaAgentLogger } from "@/lib/agents/logger";
import { createOperationalAgents } from "@/lib/agents/operational-agents";
import { PrismaAgentRuntimeServices, type AgentRuntimeServices } from "@/lib/agents/runtime-services";
import { Orchestrator } from "@/lib/orchestrator/orchestrator";
import { PrismaJobRepository } from "@/lib/orchestrator/prisma-repository";
import type { AgentLogger } from "@/lib/agents/types";
import type { JobRepository } from "@/lib/orchestrator/types";

export function createMissionControl(dependencies: {
  logger?: AgentLogger;
  jobs?: JobRepository;
  runtime?: AgentRuntimeServices;
} = {}): Orchestrator {
  const logger = dependencies.logger ?? new PrismaAgentLogger();
  const orchestrator = new Orchestrator(
    new AgentRegistry(),
    dependencies.jobs ?? new PrismaJobRepository(),
  );
  orchestrator.startup(createOperationalAgents(logger, dependencies.runtime ?? new PrismaAgentRuntimeServices()));
  return orchestrator;
}
