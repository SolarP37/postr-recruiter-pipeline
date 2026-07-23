CREATE TYPE "DeliveryAttemptStatus" AS ENUM ('STARTED', 'CONFIRMED', 'AMBIGUOUS');

CREATE TABLE "DeliveryAttempt" (
    "id" TEXT NOT NULL,
    "outreachMessageId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'gmail',
    "status" "DeliveryAttemptStatus" NOT NULL DEFAULT 'STARTED',
    "providerMessageId" TEXT,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeliveryAttempt_outreachMessageId_key" ON "DeliveryAttempt"("outreachMessageId");
CREATE INDEX "DeliveryAttempt_status_startedAt_idx" ON "DeliveryAttempt"("status", "startedAt");

ALTER TABLE "DeliveryAttempt"
ADD CONSTRAINT "DeliveryAttempt_outreachMessageId_fkey"
FOREIGN KEY ("outreachMessageId") REFERENCES "OutreachMessage"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
