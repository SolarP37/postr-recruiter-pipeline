ALTER TABLE "Prospect"
ADD COLUMN "publicLocation" TEXT,
ADD COLUMN "locationEvidenceUrl" TEXT,
ADD COLUMN "timeZone" TEXT,
ADD COLUMN "preferredSendHourLocal" INTEGER NOT NULL DEFAULT 10;

ALTER TABLE "OutreachMessage"
ADD COLUMN "scheduledFor" TIMESTAMP(3);

CREATE INDEX "OutreachMessage_scheduledFor_idx"
ON "OutreachMessage"("scheduledFor");
