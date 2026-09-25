import { afterEach, describe, expect, it } from "vitest";
import { GET as runAgentCron } from "@/app/api/cron/agents/route";
import { MemoryAgentLogger } from "@/lib/agents/logger";
import { createInitialAgents } from "@/lib/agents/shells";
import { AgentRegistry } from "@/lib/agents/registry";
import { MemoryJobRepository } from "@/lib/orchestrator/memory-repository";
import { Orchestrator } from "@/lib/orchestrator/orchestrator";
import { getAgentExecutionPolicy, getAgentWorkerConfig } from "@/lib/orchestrator/worker-config";

afterEach(() => {
  delete process.env.CRON_SECRET;
});

function setup() {
  const jobs = new MemoryJobRepository();
  const orchestrator = new Orchestrator(new AgentRegistry(), jobs);
  orchestrator.startup(createInitialAgents(new MemoryAgentLogger()));
  return { jobs, orchestrator };
}

describe("approved agent worker", () => {
  it("does not claim a job that still requires approval", async () => {
    const { jobs, orchestrator } = setup();
    const job = await orchestrator.enqueue({
      agentId: "analytics",
      taskType: "placeholder",
      requiresApproval: true,
    });
    expect(await orchestrator.runNext(new Date(Date.now() + 1_000))).toBeNull();
    job.approvedAt = new Date();
    job.approvalSource = "AUTHENTICATED_RECRUITER";
    expect((await orchestrator.runNext(new Date(Date.now() + 1_000)))?.status).toBe("COMPLETED");
    expect((await jobs.counts()).COMPLETED).toBe(1);
  });

  it("recovers a stale lock for retry when attempts remain", async () => {
    const { jobs, orchestrator } = setup();
    const job = await jobs.create({ agentId: "analytics", agentName: "Analytics Agent", taskType: "placeholder", maxAttempts: 2 });
    job.status = "RUNNING";
    job.attempts = 1;
    job.lockedAt = new Date("2026-08-17T00:00:00.000Z");
    const recovery = await orchestrator.recoverStale(new Date("2026-08-17T00:15:00.000Z"), new Date("2026-08-17T00:20:00.000Z"));
    expect(recovery).toEqual({ recovered: 1, failed: 0 });
    expect(job.status).toBe("RETRY_SCHEDULED");
    expect(job.lockedAt).toBeNull();
  });

  it("fails a stale job that has exhausted its attempts", async () => {
    const { jobs, orchestrator } = setup();
    const job = await jobs.create({ agentId: "analytics", agentName: "Analytics Agent", taskType: "placeholder", maxAttempts: 1 });
    job.status = "RUNNING";
    job.attempts = 1;
    job.lockedAt = new Date("2026-08-17T00:00:00.000Z");
    expect(await orchestrator.recoverStale(new Date("2026-08-17T00:15:00.000Z"))).toEqual({ recovered: 0, failed: 1 });
    expect(job.status).toBe("FAILED");
  });

  it("limits each worker invocation to the configured batch size", async () => {
    const { jobs, orchestrator } = setup();
    for (let index = 0; index < 4; index += 1) {
      await orchestrator.enqueue({ agentId: "analytics", taskType: "placeholder", requiresApproval: false });
    }
    expect(await orchestrator.runAvailable(2, new Date(Date.now() + 1_000))).toHaveLength(2);
    expect((await jobs.counts()).QUEUED).toBe(2);
    await expect(orchestrator.runAvailable(11)).rejects.toThrow(/between 1 and 10/i);
  });

  it("enforces per-agent execution limits without blocking other agents", async () => {
    const { jobs, orchestrator } = setup();
    await orchestrator.enqueue({ agentId: "analytics", taskType: "placeholder", requiresApproval: false });
    await orchestrator.enqueue({ agentId: "analytics", taskType: "placeholder", requiresApproval: false });
    await orchestrator.enqueue({ agentId: "creator-qualification", taskType: "placeholder", requiresApproval: false });
    const results = await orchestrator.runAvailable(3, new Date(Date.now() + 1_000), { analytics: 1, "creator-qualification": 1 });
    expect(results.map((job) => job.agentId).sort()).toEqual(["analytics", "creator-qualification"].sort());
    expect((await jobs.counts()).QUEUED).toBe(1);
  });

  it("leaves future scheduled work queued until it becomes available", async () => {
    const { jobs, orchestrator } = setup();
    const scheduledFor = new Date("2026-08-19T12:00:00.000Z");
    await orchestrator.enqueue({ agentId: "analytics", taskType: "placeholder", requiresApproval: false, scheduledFor });
    expect(await orchestrator.runNext(new Date("2026-08-19T11:59:59.000Z"))).toBeNull();
    expect((await jobs.counts()).QUEUED).toBe(1);
    expect((await orchestrator.runNext(scheduledFor))?.status).toBe("COMPLETED");
  });

  it("uses safe defaults when worker environment limits are invalid", () => {
    expect(getAgentWorkerConfig({
      AGENT_MAX_JOBS_PER_RUN: "99",
      AGENT_STALE_LOCK_MINUTES: "1",
      AGENT_QUEUE_LIMIT: "0",
    })).toEqual({ maxJobsPerRun: 3, staleLockMinutes: 15, queueLimit: 100 });
    expect(getAgentWorkerConfig({
      AGENT_MAX_JOBS_PER_RUN: "5",
      AGENT_STALE_LOCK_MINUTES: "30",
      AGENT_QUEUE_LIMIT: "250",
    })).toEqual({ maxJobsPerRun: 5, staleLockMinutes: 30, queueLimit: 250 });
  });

  it("supports bounded per-agent execution and queue limits", () => {
    expect(getAgentExecutionPolicy("creator-qualification", {
      AGENT_CREATOR_QUALIFICATION_MAX_PER_RUN: "2",
      AGENT_CREATOR_QUALIFICATION_QUEUE_LIMIT: "40",
    })).toEqual({ maxPerWorkerRun: 2, activeQueueLimit: 40 });
    expect(getAgentExecutionPolicy("creator-qualification", {
      AGENT_CREATOR_QUALIFICATION_MAX_PER_RUN: "0",
      AGENT_CREATOR_QUALIFICATION_QUEUE_LIMIT: "999",
    })).toEqual({ maxPerWorkerRun: 1, activeQueueLimit: 25 });
  });

  it("rejects scheduled worker requests without the cron secret", async () => {
    process.env.CRON_SECRET = "test-secret-with-enough-length";
    const response = await runAgentCron(new Request("https://example.test/api/cron/agents"));
    expect(response.status).toBe(401);
  });
});
