CREATE TYPE "LeadType" AS ENUM ('CREATOR', 'BRAND');

ALTER TABLE "Prospect"
ADD COLUMN "leadType" "LeadType" NOT NULL DEFAULT 'CREATOR',
ADD COLUMN "organizationName" TEXT,
ADD COLUMN "businessWebsite" TEXT;

CREATE INDEX "Prospect_leadType_idx" ON "Prospect"("leadType");
