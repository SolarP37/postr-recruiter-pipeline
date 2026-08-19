import type {
  Agent,
  AgentExecutionResult,
  AgentLogger,
  AgentStatus,
  AgentTask,
} from "@/lib/agents/types";

export abstract class BaseAgent implements Agent {
  status: AgentStatus = "IDLE";
  lastRun: Date | null = null;
  nextRun: Date | null = null;
  executionTime = 0;
  errorCount = 0;
  taskQueue: AgentTask[] = [];

  constructor(
    readonly id: string,
    readonly name: string,
    readonly description: string,
    public logger: AgentLogger,
  ) {}

  abstract execute(task: AgentTask): Promise<AgentExecutionResult>;

  async validate(task: AgentTask): Promise<boolean> {
    return Boolean(task.id && task.type);
  }

  async run(task: AgentTask, retryCount = 0): Promise<AgentExecutionResult> {
    if (this.status === "SHUTDOWN") throw new Error(`${this.name} is shut down.`);
    if (!(await this.validate(task))) throw new Error(`Invalid task for ${this.name}.`);

    const startedAt = Date.now();
    this.status = "RUNNING";
    this.lastRun = new Date(startedAt);
    await this.logger.log({
      agentId: this.id,
      agentName: this.name,
      taskId: task.id,
      jobId: task.jobId,
      event: "STARTED",
      message: `${this.name} started ${task.type}.`,
      retryCount,
      timestamp: this.lastRun,
    });

    try {
      const result = await this.execute(task);
      this.executionTime = Date.now() - startedAt;
      this.status = "IDLE";
      await this.logger.log({
        agentId: this.id,
        agentName: this.name,
        taskId: task.id,
        jobId: task.jobId,
        event: "COMPLETED",
        message: `${this.name} completed ${task.type}.`,
        durationMs: this.executionTime,
        retryCount,
        timestamp: new Date(),
      });
      return result;
    } catch (error) {
      this.executionTime = Date.now() - startedAt;
      this.errorCount += 1;
      this.status = "ERROR";
      const detail = error instanceof Error ? error.message : "Unknown agent error";
      await this.logger.log({
        agentId: this.id,
        agentName: this.name,
        taskId: task.id,
        jobId: task.jobId,
        event: "FAILED",
        message: `${this.name} failed ${task.type}.`,
        durationMs: this.executionTime,
        retryCount,
        error: detail,
        timestamp: new Date(),
      });
      throw error;
    }
  }

  async retry(task: AgentTask, retryCount = 1): Promise<AgentExecutionResult> {
    await this.logger.log({
      agentId: this.id,
      agentName: this.name,
      taskId: task.id,
      jobId: task.jobId,
      event: "RETRIED",
      message: `${this.name} retrying ${task.type}.`,
      retryCount,
      timestamp: new Date(),
    });
    return this.run(task, retryCount);
  }

  enqueue(task: AgentTask): void {
    this.taskQueue.push(task);
    if (this.status === "IDLE") this.status = "QUEUED";
  }

  dequeue(): AgentTask | undefined {
    const task = this.taskQueue.shift();
    if (this.taskQueue.length === 0 && this.status === "QUEUED") this.status = "IDLE";
    return task;
  }

  async shutdown(): Promise<void> {
    this.taskQueue = [];
    this.nextRun = null;
    this.status = "SHUTDOWN";
  }
}
