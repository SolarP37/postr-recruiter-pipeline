-- Migration 0010 created the autonomy tables before their foreign keys were
-- included in the checked-in migration. Add them idempotently so both the
-- existing Preview database and databases rebuilt from migration history
-- converge on the Prisma schema.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ContactEvidence_prospectId_fkey'
      AND conrelid = '"ContactEvidence"'::regclass
  ) THEN
    ALTER TABLE "ContactEvidence"
    ADD CONSTRAINT "ContactEvidence_prospectId_fkey"
    FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'AutonomyDecision_prospectId_fkey'
      AND conrelid = '"AutonomyDecision"'::regclass
  ) THEN
    ALTER TABLE "AutonomyDecision"
    ADD CONSTRAINT "AutonomyDecision_prospectId_fkey"
    FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'AutonomyDecision_outreachMessageId_fkey'
      AND conrelid = '"AutonomyDecision"'::regclass
  ) THEN
    ALTER TABLE "AutonomyDecision"
    ADD CONSTRAINT "AutonomyDecision_outreachMessageId_fkey"
    FOREIGN KEY ("outreachMessageId") REFERENCES "OutreachMessage"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
