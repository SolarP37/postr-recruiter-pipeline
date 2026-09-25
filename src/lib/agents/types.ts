export type AgentStatus = "IDLE" | "QUEUED" | "RUNNING" | "ERROR" | "SHUTDOWN";
export type AgentLogEvent = "STARTED" | "COMPLETED" | "FAILED" | "RETRIED";

export interface AgentTask<TPayload = unknown> {
  id: string;
  type: string;
  payload?: TPayload;
  jobId?: string;
}

export interface AgentExecutionResult<TResult = unknown> {
  taskId: string;
  output?: TResult;
}

export interface AgentLogEntry {
  agentId: string;
  agentName: string;
  taskId?: string;
  jobId?: string;
  event: AgentLogEvent;
  message: string;
  durationMs?: number;
  retryCount?: number;
  error?: string;
  timestamp: Date;
}

export interface AgentLogger {
  log(entry: AgentLogEntry): Promise<void>;
}

export class AgentTaskError extends Error {
  constructor(message: string, readonly retryable = false) {
    super(message);
    this.name = "AgentTaskError";
  }
}

export interface Agent {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  status: AgentStatus;
  lastRun: Date | null;
  nextRun: Date | null;
  executionTime: number;
  errorCount: number;
  taskQueue: AgentTask[];
  logger: AgentLogger;
  run(task: AgentTask, retryCount?: number): Promise<AgentExecutionResult>;
  execute(task: AgentTask): Promise<AgentExecutionResult>;
  validate(task: AgentTask): Promise<boolean>;
  shutdown(): Promise<void>;
  retry(task: AgentTask, retryCount?: number): Promise<AgentExecutionResult>;
}
