import type {
  AgentJobRecord,
  CreateJobInput,
  JobCompletion,
  JobFailure,
  JobRepository,
  JobStatus,
} from "@/lib/orchestrator/types";
import { PRIORITY_RANK } from "@/lib/orchestrator/types";

export class MemoryJobRepository implements JobRepository {
  readonly jobs: AgentJobRecord[] = [];
  private sequence = 0;

  async create(input: CreateJobInput): Promise<AgentJobRecord> {
    const job: AgentJobRecord = {
      id: `job-${++this.sequence}`,
      agentId: input.agentId,
      agentName: input.agentName,
      taskType: input.taskType,
      payload: input.payload,
      priority: input.priority ?? "NORMAL",
      maxAttempts: input.maxAttempts ?? 3,
      requiresApproval: input.requiresApproval ?? true,
      approvedAt: input.approvedAt ?? null,
      approvalSource: input.approvalSource ?? null,
      scheduledFor: input.scheduledFor ?? new Date(),
      status: "QUEUED",
      attempts: 0,
      createdAt: new Date(),
    };
    this.jobs.push(job);
    return job;
  }

  async claimNext(now = new Date(), excludedAgentIds: readonly string[] = []): Promise<AgentJobRecord | null> {
    const eligible = this.jobs
      .filter((job) => !excludedAgentIds.includes(job.agentId) && ["QUEUED", "RETRY_SCHEDULED"].includes(job.status) && job.scheduledFor <= now && (!job.requiresApproval || Boolean(job.approvedAt)))
      .sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] || a.createdAt.getTime() - b.createdAt.getTime());
    const job = eligible[0];
    if (!job) return null;
    job.status = "RUNNING";
    job.attempts += 1;
    job.lockedAt = now;
    return job;
  }

  async complete(job: AgentJobRecord, completion: JobCompletion): Promise<void> {
    void completion;
    job.status = "COMPLETED";
    job.lockedAt = null;
  }

  async fail(job: AgentJobRecord, failure: JobFailure): Promise<void> {
    if (failure.retryAt && job.attempts < job.maxAttempts) {
      job.status = "RETRY_SCHEDULED";
      job.scheduledFor = failure.retryAt;
      job.lockedAt = null;
    } else {
      job.status = "FAILED";
      job.lockedAt = null;
    }
  }

  async counts(): Promise<Record<JobStatus, number>> {
    const result: Record<JobStatus, number> = { QUEUED: 0, RUNNING: 0, COMPLETED: 0, FAILED: 0, RETRY_SCHEDULED: 0, CANCELLED: 0 };
    for (const job of this.jobs) result[job.status] += 1;
    return result;
  }

  async recoverStale(cutoff: Date, now = new Date()) {
    let recovered = 0;
    let failed = 0;
    for (const job of this.jobs) {
      if (job.status !== "RUNNING" || !job.lockedAt || job.lockedAt > cutoff) continue;
      job.lockedAt = null;
      if (job.attempts < job.maxAttempts) {
        job.status = "RETRY_SCHEDULED";
        job.scheduledFor = now;
        recovered += 1;
      } else {
        job.status = "FAILED";
        failed += 1;
      }
    }
    return { recovered, failed };
  }
}
