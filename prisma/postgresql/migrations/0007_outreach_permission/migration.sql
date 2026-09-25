CREATE TYPE "OutreachPermissionBasis" AS ENUM (
  'UNKNOWN',
  'EXPRESS_CONSENT',
  'EXISTING_BUSINESS_RELATIONSHIP',
  'CORPORATE_BUSINESS_CONTACT',
  'PUBLICLY_LISTED_BUSINESS_CONTACT'
);

ALTER TABLE "Prospect"
ADD COLUMN "outreachCountryCode" TEXT,
ADD COLUMN "outreachPermissionBasis" "OutreachPermissionBasis" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN "outreachPermissionEvidence" TEXT,
ADD COLUMN "outreachPermissionCheckedAt" TIMESTAMP(3);
