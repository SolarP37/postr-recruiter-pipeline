import { AgentRegistry } from "@/lib/agents/registry";
import { AgentTaskError, type Agent, type AgentExecutionResult } from "@/lib/agents/types";
import type { AgentJobRecord, CreateJobInput, JobRepository } from "@/lib/orchestrator/types";

export interface OrchestratorOptions {
  retryDelayMs?: number;
}

export class Orchestrator {
  private started = false;
  private readonly retryDelayMs: number;

  constructor(
    readonly registry: AgentRegistry,
    readonly jobs: JobRepository,
    options: OrchestratorOptions = {},
  ) {
    this.retryDelayMs = options.retryDelayMs ?? 60_000;
  }

  startup(agents: Agent[]): void {
    if (this.started) return;
    for (const agent of agents) this.registry.register(agent);
    this.started = true;
  }

  isStarted(): boolean {
    return this.started;
  }

  async enqueue(input: Omit<CreateJobInput, "agentName">): Promise<AgentJobRecord> {
    if (!this.started) throw new Error("Orchestrator has not started.");
    const agent = this.registry.get(input.agentId);
    if (!agent) throw new Error(`Agent ${input.agentId} is not registered.`);
    return this.jobs.create({ ...input, agentName: agent.name });
  }

  async runNext(now = new Date(), excludedAgentIds: readonly string[] = []): Promise<AgentJobRecord | null> {
    if (!this.started) throw new Error("Orchestrator has not started.");
    const job = await this.jobs.claimNext(now, excludedAgentIds);
    if (!job) return null;

    const agent = this.registry.get(job.agentId);
    if (!agent) {
      await this.jobs.fail(job, { error: `Agent ${job.agentId} is not registered.`, durationMs: 0 });
      return job;
    }

    const startedAt = Date.now();
    try {
      const task = { id: job.id, jobId: job.id, type: job.taskType, payload: job.payload };
      const result: AgentExecutionResult = job.attempts > 1
        ? await agent.retry(task, job.attempts - 1)
        : await agent.run(task);
      await this.jobs.complete(job, { output: result.output, durationMs: Date.now() - startedAt });
      return { ...job, status: "COMPLETED" };
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown agent error";
      const retryable = !(error instanceof AgentTaskError) || error.retryable;
      const retryAt = retryable && job.attempts < job.maxAttempts ? new Date(now.getTime() + this.retryDelayMs) : undefined;
      await this.jobs.fail(job, { error: detail, durationMs: Date.now() - startedAt, retryAt });
      return { ...job, status: retryAt ? "RETRY_SCHEDULED" : "FAILED", scheduledFor: retryAt ?? job.scheduledFor };
    }
  }

  async recoverStale(cutoff: Date, now = new Date()) {
    if (!this.started) throw new Error("Orchestrator has not started.");
    return this.jobs.recoverStale(cutoff, now);
  }

  async runAvailable(maxJobs: number, now = new Date(), perAgentLimits: Readonly<Record<string, number>> = {}): Promise<AgentJobRecord[]> {
    if (!Number.isInteger(maxJobs) || maxJobs < 1 || maxJobs > 10) {
      throw new Error("Worker batch size must be between 1 and 10.");
    }
    const results: AgentJobRecord[] = [];
    const agentCounts = new Map<string, number>();
    for (let index = 0; index < maxJobs; index += 1) {
      const excludedAgentIds = Object.entries(perAgentLimits)
        .filter(([agentId, limit]) => (agentCounts.get(agentId) ?? 0) >= limit)
        .map(([agentId]) => agentId);
      const job = await this.runNext(now, excludedAgentIds);
      if (!job) break;
      results.push(job);
      agentCounts.set(job.agentId, (agentCounts.get(job.agentId) ?? 0) + 1);
    }
    return results;
  }
}
