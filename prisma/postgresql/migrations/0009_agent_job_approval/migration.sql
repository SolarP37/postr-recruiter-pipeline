ALTER TABLE "AgentJob"
ADD COLUMN "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "approvalSource" TEXT;

UPDATE "AgentJob"
SET "approvedAt" = "createdAt",
    "approvalSource" = 'SPRINT1_MIGRATION'
WHERE "status" IN ('QUEUED', 'RUNNING', 'RETRY_SCHEDULED');

CREATE INDEX "AgentJob_requiresApproval_approvedAt_idx"
ON "AgentJob"("requiresApproval", "approvedAt");
