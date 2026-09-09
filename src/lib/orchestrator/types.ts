export type JobStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "RETRY_SCHEDULED" | "CANCELLED";
export type JobPriority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";

export interface CreateJobInput {
  agentId: string;
  agentName: string;
  taskType: string;
  payload?: unknown;
  priority?: JobPriority;
  maxAttempts?: number;
  scheduledFor?: Date;
  requiresApproval?: boolean;
  approvedAt?: Date | null;
  approvalSource?: string | null;
}

export interface AgentJobRecord {
  id: string;
  agentId: string;
  agentName: string;
  taskType: string;
  payload?: unknown;
  priority: JobPriority;
  maxAttempts: number;
  scheduledFor: Date;
  requiresApproval: boolean;
  approvedAt: Date | null;
  approvalSource: string | null;
  status: JobStatus;
  attempts: number;
  createdAt: Date;
  lockedAt?: Date | null;
}

export interface JobCompletion {
  output?: unknown;
  durationMs: number;
}

export interface JobFailure {
  error: string;
  durationMs: number;
  retryAt?: Date;
}

export interface JobRepository {
  create(input: CreateJobInput): Promise<AgentJobRecord>;
  claimNext(now?: Date, excludedAgentIds?: readonly string[]): Promise<AgentJobRecord | null>;
  complete(job: AgentJobRecord, completion: JobCompletion): Promise<void>;
  fail(job: AgentJobRecord, failure: JobFailure): Promise<void>;
  counts(): Promise<Record<JobStatus, number>>;
  recoverStale(cutoff: Date, now?: Date): Promise<StaleRecoveryResult>;
}

export interface StaleRecoveryResult {
  recovered: number;
  failed: number;
}

export const PRIORITY_RANK: Record<JobPriority, number> = {
  LOW: 0,
  NORMAL: 1,
  HIGH: 2,
  CRITICAL: 3,
};
