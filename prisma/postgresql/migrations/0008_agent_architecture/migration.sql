CREATE TYPE "AgentJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'RETRY_SCHEDULED', 'CANCELLED');
CREATE TYPE "AgentJobPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');
CREATE TYPE "AgentLogEvent" AS ENUM ('STARTED', 'COMPLETED', 'FAILED', 'RETRIED');

CREATE TABLE "AgentJob" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "payload" TEXT,
    "result" TEXT,
    "status" "AgentJobStatus" NOT NULL DEFAULT 'QUEUED',
    "priority" "AgentJobPriority" NOT NULL DEFAULT 'NORMAL',
    "priorityRank" INTEGER NOT NULL DEFAULT 1,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "scheduledFor" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AgentJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgentQueueItem" (
    "id" TEXT NOT NULL,
    "agentJobId" TEXT NOT NULL,
    "priority" "AgentJobPriority" NOT NULL DEFAULT 'NORMAL',
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AgentQueueItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgentLog" (
    "id" TEXT NOT NULL,
    "agentJobId" TEXT,
    "agentId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "taskId" TEXT,
    "event" "AgentLogEvent" NOT NULL,
    "message" TEXT NOT NULL,
    "durationMs" INTEGER,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgentTaskHistory" (
    "id" TEXT NOT NULL,
    "agentJobId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "status" "AgentJobStatus" NOT NULL,
    "attempt" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentTaskHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgentExecutionMetric" (
    "id" TEXT NOT NULL,
    "agentJobId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "executionTimeMs" INTEGER NOT NULL,
    "successful" BOOLEAN NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentExecutionMetric_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AgentJob_status_priority_scheduledFor_idx" ON "AgentJob"("status", "priority", "scheduledFor");
CREATE INDEX "AgentJob_agentId_createdAt_idx" ON "AgentJob"("agentId", "createdAt");
CREATE UNIQUE INDEX "AgentQueueItem_agentJobId_key" ON "AgentQueueItem"("agentJobId");
CREATE INDEX "AgentQueueItem_availableAt_priorityRank_idx" ON "AgentQueueItem"("availableAt", "priorityRank");
CREATE INDEX "AgentLog_agentId_timestamp_idx" ON "AgentLog"("agentId", "timestamp");
CREATE INDEX "AgentLog_agentJobId_timestamp_idx" ON "AgentLog"("agentJobId", "timestamp");
CREATE INDEX "AgentTaskHistory_agentJobId_attempt_idx" ON "AgentTaskHistory"("agentJobId", "attempt");
CREATE INDEX "AgentTaskHistory_agentId_createdAt_idx" ON "AgentTaskHistory"("agentId", "createdAt");
CREATE INDEX "AgentExecutionMetric_agentId_recordedAt_idx" ON "AgentExecutionMetric"("agentId", "recordedAt");
CREATE INDEX "AgentExecutionMetric_successful_recordedAt_idx" ON "AgentExecutionMetric"("successful", "recordedAt");

ALTER TABLE "AgentQueueItem" ADD CONSTRAINT "AgentQueueItem_agentJobId_fkey" FOREIGN KEY ("agentJobId") REFERENCES "AgentJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentLog" ADD CONSTRAINT "AgentLog_agentJobId_fkey" FOREIGN KEY ("agentJobId") REFERENCES "AgentJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AgentTaskHistory" ADD CONSTRAINT "AgentTaskHistory_agentJobId_fkey" FOREIGN KEY ("agentJobId") REFERENCES "AgentJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentExecutionMetric" ADD CONSTRAINT "AgentExecutionMetric_agentJobId_fkey" FOREIGN KEY ("agentJobId") REFERENCES "AgentJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
