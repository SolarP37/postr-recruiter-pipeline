import { describe, expect, it } from "vitest";
import { MemoryAgentLogger } from "@/lib/agents/logger";
import type { AgentRuntimeServices } from "@/lib/agents/runtime-services";
import { missionControlTaskSchema } from "@/lib/agents/task-contracts";
import { AgentTaskError } from "@/lib/agents/types";
import { createMissionControl } from "@/lib/mission-control";
import { MemoryJobRepository } from "@/lib/orchestrator/memory-repository";

class FakeRuntime implements AgentRuntimeServices {
  calls: string[] = [];
  outreachError: Error | null = null;

  async discover(query: string, limit: number) {
    this.calls.push(`discover:${query}:${limit}`);
    return { results: [], crmChanged: false };
  }

  async discoverBrands(query: string, limit: number) { this.calls.push(`discover-brands:${query}:${limit}`); return { results: [], crmChanged: false }; }

  async inspectResearchUrl(url: string) {
    this.calls.push(`research:${url}`);
    return { result: { url }, crmChanged: false };
  }

  async readApifyDataset(limit: number) {
    this.calls.push(`apify:${limit}`);
    return { results: [], crmChanged: false };
  }

  async evaluateQualification(prospectId: string) {
    this.calls.push(`qualification:${prospectId}`);
    return { prospectId, recommendation: "NEEDS_REVIEW", applied: false };
  }

  async prepareOutreach(prospectId: string) {
    this.calls.push(`outreach:${prospectId}`);
    if (this.outreachError) throw this.outreachError;
    return { prospectId, approvalStatus: "PENDING", sent: false };
  }

  async prepareFollowUp(prospectId: string) {
    this.calls.push(`followup:${prospectId}`);
    return { prospectId, approvalStatus: "PENDING", sent: false };
  }

  async evaluateAutonomy(messageId: string, action: "CREATE_GMAIL_DRAFT" | "SEND_INITIAL" | "SEND_FOLLOW_UP") { this.calls.push(`autonomy:${messageId}:${action}`); return { messageId, action, outcome: "REVIEW", executed: false }; }

  async analyticsSnapshot() {
    this.calls.push("analytics");
    return { prospects: 1 };
  }
}

function setup(runtime = new FakeRuntime()) {
  const jobs = new MemoryJobRepository();
  const logger = new MemoryAgentLogger();
  const missionControl = createMissionControl({ jobs, logger, runtime });
  return { jobs, logger, missionControl, runtime };
}

describe("Sprint 2 controlled agent integration", () => {
  it("allows only explicit governed task contracts", () => {
    expect(missionControlTaskSchema.safeParse({ type: "discovery.search", query: "fitness creators Austin" }).success).toBe(true);
    expect(missionControlTaskSchema.safeParse({ type: "brand.discovery.search", query: "beauty brands Austin" }).success).toBe(true);
    expect(missionControlTaskSchema.safeParse({ type: "research.inspect", url: "https://example.com/profile" }).success).toBe(true);
    expect(missionControlTaskSchema.safeParse({ type: "research.apify_dataset" }).success).toBe(true);
    expect(missionControlTaskSchema.safeParse({ type: "qualification.evaluate", prospectId: "prospect-1" }).success).toBe(true);
    expect(missionControlTaskSchema.safeParse({ type: "outreach.prepare", prospectId: "prospect-1" }).success).toBe(true);
    expect(missionControlTaskSchema.safeParse({ type: "followup.prepare", prospectId: "prospect-1" }).success).toBe(true);
    expect(missionControlTaskSchema.safeParse({ type: "analytics.snapshot" }).success).toBe(true);
    expect(missionControlTaskSchema.safeParse({ type: "autonomy.evaluate", messageId: "message-1", action: "SEND_INITIAL" }).success).toBe(true);
    expect(missionControlTaskSchema.safeParse({ type: "gmail.send", prospectId: "prospect-1" }).success).toBe(false);
    expect(missionControlTaskSchema.safeParse({ type: "outreach.prepare" }).success).toBe(false);
  });

  it("routes brand discovery through a distinct governed task", async () => {
    const { missionControl, runtime } = setup();
    await missionControl.enqueue({ agentId: "brand-discovery", taskType: "brand.discovery.search", payload: { query: "beauty brands Austin", limit: 4 }, requiresApproval: false });
    expect((await missionControl.runNext(new Date(Date.now() + 1_000)))?.status).toBe("COMPLETED");
    expect(runtime.calls).toEqual(["discover-brands:beauty brands Austin:4"]);
  });

  it("records an autonomy evaluation without executing delivery", async () => {
    const { missionControl, runtime } = setup();
    await missionControl.enqueue({ agentId: "email-generation", taskType: "autonomy.evaluate", payload: { messageId: "message-1", action: "SEND_INITIAL" }, requiresApproval: false });
    expect((await missionControl.runNext(new Date(Date.now() + 1_000)))?.status).toBe("COMPLETED");
    expect(runtime.calls).toEqual(["autonomy:message-1:SEND_INITIAL"]);
  });

  it("routes research without requesting a CRM mutation", async () => {
    const { missionControl, runtime } = setup();
    await missionControl.enqueue({
      agentId: "creator-discovery",
      taskType: "discovery.search",
      payload: { query: "fitness creators Austin", limit: 3 },
      requiresApproval: false,
    });
    expect((await missionControl.runNext(new Date(Date.now() + 1_000)))?.status).toBe("COMPLETED");
    expect(runtime.calls).toEqual(["discover:fitness creators Austin:3"]);
  });

  it("routes follow-up preparation to an unsent review draft", async () => {
    const { missionControl, runtime } = setup();
    await missionControl.enqueue({
      agentId: "followup",
      taskType: "followup.prepare",
      payload: { prospectId: "prospect-1" },
      requiresApproval: false,
    });
    expect((await missionControl.runNext(new Date(Date.now() + 1_000)))?.status).toBe("COMPLETED");
    expect(runtime.calls).toEqual(["followup:prospect-1"]);
  });

  it("routes qualification to a recommendation-only runtime adapter", async () => {
    const { missionControl, runtime, jobs } = setup();
    await missionControl.enqueue({
      agentId: "creator-qualification",
      taskType: "qualification.evaluate",
      payload: { prospectId: "prospect-1" },
      requiresApproval: false,
    });
    const result = await missionControl.runNext(new Date(Date.now() + 1_000));
    expect(result?.status).toBe("COMPLETED");
    expect(runtime.calls).toEqual(["qualification:prospect-1"]);
    expect((await jobs.counts()).COMPLETED).toBe(1);
  });

  it("routes analytics through a read-only snapshot task", async () => {
    const { missionControl, runtime } = setup();
    await missionControl.enqueue({ agentId: "analytics", taskType: "analytics.snapshot", requiresApproval: false });
    expect((await missionControl.runNext(new Date(Date.now() + 1_000)))?.status).toBe("COMPLETED");
    expect(runtime.calls).toEqual(["analytics"]);
  });

  it("does not retry outreach policy failures", async () => {
    const runtime = new FakeRuntime();
    runtime.outreachError = new AgentTaskError("Prospect must be approved first.", false);
    const { missionControl, jobs, logger } = setup(runtime);
    await missionControl.enqueue({
      agentId: "email-generation",
      taskType: "outreach.prepare",
      payload: { prospectId: "prospect-1" },
      maxAttempts: 3,
      requiresApproval: false,
    });
    const result = await missionControl.runNext(new Date(Date.now() + 1_000));
    expect(result?.status).toBe("FAILED");
    expect(jobs.jobs[0].attempts).toBe(1);
    expect(logger.entries.map((entry) => entry.event)).toEqual(["STARTED", "FAILED"]);
  });

  it("keeps transient runtime failures eligible for a bounded retry", async () => {
    const runtime = new FakeRuntime();
    runtime.outreachError = new Error("Temporary database outage");
    const { missionControl, jobs } = setup(runtime);
    await missionControl.enqueue({
      agentId: "email-generation",
      taskType: "outreach.prepare",
      payload: { prospectId: "prospect-1" },
      maxAttempts: 2,
      requiresApproval: false,
    });
    const result = await missionControl.runNext(new Date(Date.now() + 1_000));
    expect(result?.status).toBe("RETRY_SCHEDULED");
    expect((await jobs.counts()).RETRY_SCHEDULED).toBe(1);
  });
});
