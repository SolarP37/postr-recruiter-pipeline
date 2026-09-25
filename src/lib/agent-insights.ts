export type AgentHealth = "HEALTHY" | "DEGRADED" | "READY" | "PLACEHOLDER";

interface InsightJob {
  agentId: string;
  status: string;
  scheduledFor: Date;
  createdAt: Date;
}

interface InsightMetric {
  agentId: string;
  successful: boolean;
  executionTimeMs: number;
  retryCount: number;
  recordedAt: Date;
}

export function buildAgentInsight(agentId: string, connected: boolean, jobs: readonly InsightJob[], metrics: readonly InsightMetric[], now = new Date()) {
  const agentJobs = jobs.filter((job) => job.agentId === agentId);
  const agentMetrics = metrics.filter((metric) => metric.agentId === agentId);
  const successful = agentMetrics.filter((metric) => metric.successful).length;
  const failed = agentMetrics.length - successful;
  const active = agentJobs.filter((job) => ["QUEUED", "RUNNING", "RETRY_SCHEDULED"].includes(job.status)).length;
  const scheduled = agentJobs.filter((job) => ["QUEUED", "RETRY_SCHEDULED"].includes(job.status) && job.scheduledFor > now).length;
  const successRate = agentMetrics.length ? Math.round((successful / agentMetrics.length) * 100) : null;
  const averageDurationMs = agentMetrics.length ? Math.round(agentMetrics.reduce((sum, metric) => sum + metric.executionTimeMs, 0) / agentMetrics.length) : 0;
  const retryCount = agentMetrics.reduce((sum, metric) => sum + metric.retryCount, 0);
  const latestMetric = [...agentMetrics].sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())[0];
  const health: AgentHealth = !connected ? "PLACEHOLDER" : !latestMetric ? "READY" : !latestMetric.successful || (successRate ?? 100) < 75 ? "DEGRADED" : "HEALTHY";
  return { health, active, scheduled, runs: agentMetrics.length, successful, failed, successRate, averageDurationMs, retryCount, lastRunAt: latestMetric?.recordedAt ?? null };
}
