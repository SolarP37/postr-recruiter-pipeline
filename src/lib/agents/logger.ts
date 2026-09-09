import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import type { AgentLogEntry, AgentLogger } from "@/lib/agents/types";

export class PrismaAgentLogger implements AgentLogger {
  async log(entry: AgentLogEntry): Promise<void> {
    await db.agentLog.create({
      data: {
        agentJobId: entry.jobId,
        agentId: entry.agentId,
        agentName: entry.agentName,
        taskId: entry.taskId,
        event: entry.event,
        message: entry.message,
        durationMs: entry.durationMs,
        retryCount: entry.retryCount ?? 0,
        error: entry.error,
        timestamp: entry.timestamp,
      },
    });

    await audit(`AGENT_${entry.event}`, "AgentTask", entry.taskId, {
      agentId: entry.agentId,
      agentName: entry.agentName,
      jobId: entry.jobId,
      durationMs: entry.durationMs,
      retryCount: entry.retryCount ?? 0,
      error: entry.error,
      timestamp: entry.timestamp.toISOString(),
    }).catch(() => undefined);
  }
}

export class MemoryAgentLogger implements AgentLogger {
  readonly entries: AgentLogEntry[] = [];

  async log(entry: AgentLogEntry): Promise<void> {
    this.entries.push(entry);
  }
}
