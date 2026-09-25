import { db } from "@/lib/db";
import type {
  AgentJobRecord,
  CreateJobInput,
  JobCompletion,
  JobFailure,
  JobRepository,
  JobStatus,
} from "@/lib/orchestrator/types";
import { PRIORITY_RANK } from "@/lib/orchestrator/types";

function parseJson(value: string | null): unknown {
  if (!value) return undefined;
  try { return JSON.parse(value); } catch { return undefined; }
}

function toRecord(job: {
  id: string; agentId: string; agentName: string; taskType: string; payload: string | null;
  status: JobStatus; priority: AgentJobRecord["priority"]; attempts: number; maxAttempts: number;
  requiresApproval: boolean; approvedAt: Date | null; approvalSource: string | null;
  scheduledFor: Date; createdAt: Date;
}): AgentJobRecord {
  return { ...job, payload: parseJson(job.payload) };
}

export class PrismaJobRepository implements JobRepository {
  async create(input: CreateJobInput): Promise<AgentJobRecord> {
    const priority = input.priority ?? "NORMAL";
    const job = await db.agentJob.create({
      data: {
        agentId: input.agentId,
        agentName: input.agentName,
        taskType: input.taskType,
        payload: input.payload === undefined ? null : JSON.stringify(input.payload),
        priority,
        maxAttempts: input.maxAttempts ?? 3,
        requiresApproval: input.requiresApproval ?? true,
        approvedAt: input.approvedAt ?? null,
        approvalSource: input.approvalSource ?? null,
        scheduledFor: input.scheduledFor ?? new Date(),
        queueItem: { create: { priority, priorityRank: PRIORITY_RANK[priority], availableAt: input.scheduledFor ?? new Date() } },
      },
    });
    return toRecord(job);
  }

  async claimNext(now = new Date(), excludedAgentIds: readonly string[] = []): Promise<AgentJobRecord | null> {
    return db.$transaction(async (tx) => {
      const candidate = await tx.agentQueueItem.findFirst({
        where: {
          lockedAt: null,
          availableAt: { lte: now },
          job: {
            ...(excludedAgentIds.length ? { agentId: { notIn: [...excludedAgentIds] } } : {}),
            status: { in: ["QUEUED", "RETRY_SCHEDULED"] },
            OR: [{ requiresApproval: false }, { approvedAt: { not: null } }],
          },
        },
        orderBy: [{ priorityRank: "desc" }, { availableAt: "asc" }, { createdAt: "asc" }],
        include: { job: true },
      });
      if (!candidate) return null;

      const claimed = await tx.agentQueueItem.updateMany({
        where: { id: candidate.id, lockedAt: null },
        data: { lockedAt: now },
      });
      if (claimed.count !== 1) return null;

      const job = await tx.agentJob.update({
        where: { id: candidate.agentJobId },
        data: { status: "RUNNING", attempts: { increment: 1 }, startedAt: now, lastError: null },
      });
      await tx.agentTaskHistory.create({
        data: { agentJobId: job.id, agentId: job.agentId, status: "RUNNING", attempt: job.attempts, startedAt: now },
      });
      return toRecord(job);
    });
  }

  async complete(job: AgentJobRecord, completion: JobCompletion): Promise<void> {
    const completedAt = new Date();
    await db.$transaction([
      db.agentJob.update({ where: { id: job.id }, data: { status: "COMPLETED", result: completion.output === undefined ? null : JSON.stringify(completion.output), completedAt } }),
      db.agentQueueItem.delete({ where: { agentJobId: job.id } }),
      db.agentTaskHistory.updateMany({ where: { agentJobId: job.id, attempt: job.attempts }, data: { status: "COMPLETED", completedAt, durationMs: completion.durationMs } }),
      db.agentExecutionMetric.create({ data: { agentJobId: job.id, agentId: job.agentId, agentName: job.agentName, executionTimeMs: completion.durationMs, successful: true, retryCount: Math.max(job.attempts - 1, 0) } }),
    ]);
  }

  async fail(job: AgentJobRecord, failure: JobFailure): Promise<void> {
    const completedAt = new Date();
    const willRetry = Boolean(failure.retryAt && job.attempts < job.maxAttempts);
    await db.$transaction([
      db.agentJob.update({ where: { id: job.id }, data: { status: willRetry ? "RETRY_SCHEDULED" : "FAILED", lastError: failure.error, completedAt: willRetry ? null : completedAt, scheduledFor: failure.retryAt ?? job.scheduledFor } }),
      ...(willRetry
        ? [db.agentQueueItem.update({ where: { agentJobId: job.id }, data: { lockedAt: null, availableAt: failure.retryAt } })]
        : [db.agentQueueItem.delete({ where: { agentJobId: job.id } })]),
      db.agentTaskHistory.updateMany({ where: { agentJobId: job.id, attempt: job.attempts }, data: { status: willRetry ? "RETRY_SCHEDULED" : "FAILED", completedAt, durationMs: failure.durationMs, error: failure.error } }),
      db.agentExecutionMetric.create({ data: { agentJobId: job.id, agentId: job.agentId, agentName: job.agentName, executionTimeMs: failure.durationMs, successful: false, retryCount: Math.max(job.attempts - 1, 0), errorCount: 1 } }),
    ]);
  }

  async counts(): Promise<Record<JobStatus, number>> {
    const groups = await db.agentJob.groupBy({ by: ["status"], _count: { _all: true } });
    const result: Record<JobStatus, number> = { QUEUED: 0, RUNNING: 0, COMPLETED: 0, FAILED: 0, RETRY_SCHEDULED: 0, CANCELLED: 0 };
    for (const group of groups) result[group.status] = group._count._all;
    return result;
  }

  async recoverStale(cutoff: Date, now = new Date()) {
    const stale = await db.agentQueueItem.findMany({
      where: { lockedAt: { lte: cutoff }, job: { status: "RUNNING" } },
      include: { job: true },
      take: 100,
    });
    let recovered = 0;
    let failed = 0;

    for (const item of stale) {
      const willRetry = item.job.attempts < item.job.maxAttempts;
      const error = "Worker lock expired before completion.";
      await db.$transaction([
        db.agentJob.update({
          where: { id: item.agentJobId },
          data: {
            status: willRetry ? "RETRY_SCHEDULED" : "FAILED",
            scheduledFor: willRetry ? now : item.job.scheduledFor,
            completedAt: willRetry ? null : now,
            lastError: error,
          },
        }),
        ...(willRetry
          ? [db.agentQueueItem.update({ where: { id: item.id }, data: { lockedAt: null, availableAt: now } })]
          : [db.agentQueueItem.delete({ where: { id: item.id } })]),
        db.agentTaskHistory.updateMany({
          where: { agentJobId: item.agentJobId, attempt: item.job.attempts, status: "RUNNING" },
          data: { status: willRetry ? "RETRY_SCHEDULED" : "FAILED", completedAt: now, error },
        }),
        db.agentExecutionMetric.create({
          data: {
            agentJobId: item.agentJobId,
            agentId: item.job.agentId,
            agentName: item.job.agentName,
            executionTimeMs: Math.max(now.getTime() - (item.job.startedAt?.getTime() ?? now.getTime()), 0),
            successful: false,
            retryCount: Math.max(item.job.attempts - 1, 0),
            errorCount: 1,
          },
        }),
        db.agentLog.create({
          data: {
            agentJobId: item.agentJobId,
            agentId: item.job.agentId,
            agentName: item.job.agentName,
            taskId: item.agentJobId,
            event: willRetry ? "RETRIED" : "FAILED",
            message: willRetry ? `${item.job.agentName} recovered a stale task.` : `${item.job.agentName} failed after a stale task lock.`,
            retryCount: Math.max(item.job.attempts - 1, 0),
            error,
            timestamp: now,
          },
        }),
      ]);
      if (willRetry) recovered += 1;
      else failed += 1;
    }
    return { recovered, failed };
  }
}
