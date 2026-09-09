-- Agent execution priority is represented by AgentQueueItem.priorityRank.
-- Remove the unused AgentJob copy created by migration 0008 so a database
-- rebuilt from migrations matches the current Prisma schema.
ALTER TABLE "AgentJob" DROP COLUMN "priorityRank";
