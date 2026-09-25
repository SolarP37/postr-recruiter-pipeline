import { describe, expect, it } from "vitest";
import { buildAgentInsight } from "@/lib/agent-insights";

describe("agent execution insights", () => {
  it("marks a connected agent degraded when its latest run failed", () => {
    const now = new Date("2026-08-18T12:00:00.000Z");
    const insight = buildAgentInsight("analytics", true, [
      { agentId: "analytics", status: "QUEUED", scheduledFor: new Date("2026-08-19T12:00:00.000Z"), createdAt: now },
    ], [
      { agentId: "analytics", successful: true, executionTimeMs: 100, retryCount: 0, recordedAt: new Date("2026-08-18T10:00:00.000Z") },
      { agentId: "analytics", successful: false, executionTimeMs: 300, retryCount: 1, recordedAt: new Date("2026-08-18T11:00:00.000Z") },
    ], now);
    expect(insight).toMatchObject({ health: "DEGRADED", active: 1, scheduled: 1, runs: 2, successRate: 50, averageDurationMs: 200, retryCount: 1 });
  });

  it("keeps unconnected shells visibly placeholder-only", () => {
    expect(buildAgentInsight("research", false, [], [])).toMatchObject({ health: "PLACEHOLDER", runs: 0 });
  });
});
