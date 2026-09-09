CREATE TYPE "AutonomyDecisionOutcome" AS ENUM ('ALLOW', 'REVIEW', 'DENY');
CREATE TYPE "AutonomyAction" AS ENUM ('CREATE_INTERNAL_DRAFT', 'CREATE_GMAIL_DRAFT', 'SEND_INITIAL', 'SEND_FOLLOW_UP');

CREATE TABLE "ContactEvidence" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "evidence" TEXT NOT NULL,
    "contactPurpose" TEXT,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    CONSTRAINT "ContactEvidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AutonomyDecision" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "outreachMessageId" TEXT,
    "action" "AutonomyAction" NOT NULL,
    "outcome" "AutonomyDecisionOutcome" NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "reasons" TEXT NOT NULL,
    "evidenceSnapshot" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AutonomyDecision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContactEvidence_prospectId_collectedAt_idx" ON "ContactEvidence"("prospectId", "collectedAt");
CREATE INDEX "ContactEvidence_kind_verifiedAt_idx" ON "ContactEvidence"("kind", "verifiedAt");
CREATE INDEX "AutonomyDecision_prospectId_decidedAt_idx" ON "AutonomyDecision"("prospectId", "decidedAt");
CREATE INDEX "AutonomyDecision_outcome_action_decidedAt_idx" ON "AutonomyDecision"("outcome", "action", "decidedAt");
CREATE INDEX "AutonomyDecision_outreachMessageId_idx" ON "AutonomyDecision"("outreachMessageId");

ALTER TABLE "ContactEvidence" ADD CONSTRAINT "ContactEvidence_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AutonomyDecision" ADD CONSTRAINT "AutonomyDecision_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AutonomyDecision" ADD CONSTRAINT "AutonomyDecision_outreachMessageId_fkey" FOREIGN KEY ("outreachMessageId") REFERENCES "OutreachMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
