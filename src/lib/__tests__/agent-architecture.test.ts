import { describe, expect, it } from "vitest";
import { BaseAgent } from "@/lib/agents/base-agent";
import { MemoryAgentLogger } from "@/lib/agents/logger";
import { AgentRegistry } from "@/lib/agents/registry";
import { CreatorDiscoveryAgent, createInitialAgents } from "@/lib/agents/shells";
import type { AgentExecutionResult, AgentTask } from "@/lib/agents/types";
import { createMissionControl } from "@/lib/mission-control";
import { MemoryJobRepository } from "@/lib/orchestrator/memory-repository";
import { Orchestrator } from "@/lib/orchestrator/orchestrator";

class FlakyAgent extends BaseAgent {
  calls = 0;

  async execute(task: AgentTask): Promise<AgentExecutionResult> {
    this.calls += 1;
    if (this.calls === 1) throw new Error("Temporary failure");
    return { taskId: task.id, output: { recovered: true } };
  }
}

describe("agent architecture foundation", () => {
  it("registers agents and rejects duplicate IDs", () => {
    const logger = new MemoryAgentLogger();
    const registry = new AgentRegistry();
    registry.register(new CreatorDiscoveryAgent(logger));
    expect(registry.has("creator-discovery")).toBe(true);
    expect(registry.list()).toHaveLength(1);
    expect(() => registry.register(new CreatorDiscoveryAgent(logger))).toThrow("already registered");
  });

  it("starts Mission Control with all initial agent shells", () => {
    const missionControl = createMissionControl({ logger: new MemoryAgentLogger(), jobs: new MemoryJobRepository() });
    expect(missionControl.isStarted()).toBe(true);
    expect(missionControl.registry.list().map((agent) => agent.id)).toEqual(
      createInitialAgents(new MemoryAgentLogger()).map((agent) => agent.id),
    );
  });

  it("creates and prioritizes queued jobs", async () => {
    const logger = new MemoryAgentLogger();
    const jobs = new MemoryJobRepository();
    const orchestrator = new Orchestrator(new AgentRegistry(), jobs);
    orchestrator.startup(createInitialAgents(logger));
    await orchestrator.enqueue({ agentId: "creator-discovery", taskType: "low-priority", priority: "LOW", requiresApproval: false });
    await orchestrator.enqueue({ agentId: "creator-discovery", taskType: "urgent", priority: "CRITICAL", requiresApproval: false });

    const executed = await orchestrator.runNext(new Date(Date.now() + 1_000));
    expect(executed?.taskType).toBe("urgent");
    expect(executed?.status).toBe("COMPLETED");
    expect((await jobs.counts()).QUEUED).toBe(1);
  });

  it("records started and completed logs for a job execution", async () => {
    const logger = new MemoryAgentLogger();
    const jobs = new MemoryJobRepository();
    const orchestrator = new Orchestrator(new AgentRegistry(), jobs);
    orchestrator.startup([new CreatorDiscoveryAgent(logger)]);
    await orchestrator.enqueue({ agentId: "creator-discovery", taskType: "placeholder", requiresApproval: false });
    await orchestrator.runNext(new Date(Date.now() + 1_000));

    expect(logger.entries.map((entry) => entry.event)).toEqual(["STARTED", "COMPLETED"]);
    expect(logger.entries.every((entry) => entry.agentName === "Creator Discovery Agent")).toBe(true);
    expect(logger.entries[1].durationMs).toBeGreaterThanOrEqual(0);
    expect(logger.entries[1].timestamp).toBeInstanceOf(Date);
  });

  it("retries a failed job and then completes it without exceeding its limit", async () => {
    const logger = new MemoryAgentLogger();
    const jobs = new MemoryJobRepository();
    const orchestrator = new Orchestrator(new AgentRegistry(), jobs, { retryDelayMs: 10 });
    const agent = new FlakyAgent("flaky", "Flaky Agent", "Test retry behavior.", logger);
    orchestrator.startup([agent]);
    await orchestrator.enqueue({ agentId: "flaky", taskType: "retry-test", maxAttempts: 2, scheduledFor: new Date("2026-08-16T00:00:00.000Z"), requiresApproval: false });

    const first = await orchestrator.runNext(new Date("2026-08-17T00:00:00.000Z"));
    expect(first?.status).toBe("RETRY_SCHEDULED");
    const second = await orchestrator.runNext(new Date("2026-08-17T00:00:00.020Z"));
    expect(second?.status).toBe("COMPLETED");
    expect(agent.calls).toBe(2);
    expect(logger.entries.map((entry) => entry.event)).toEqual(["STARTED", "FAILED", "RETRIED", "STARTED", "COMPLETED"]);
  });
});
