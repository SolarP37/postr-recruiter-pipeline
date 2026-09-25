CREATE TYPE "QualificationStatus" AS ENUM (
  'QUALIFIED',
  'LIKELY_QUALIFIED',
  'NEEDS_REVIEW',
  'NOT_YET_QUALIFIED',
  'DO_NOT_CONTACT'
);

ALTER TABLE "Prospect"
ADD COLUMN "creatorFirstName" TEXT,
ADD COLUMN "username" TEXT,
ADD COLUMN "emailSourceUrl" TEXT,
ADD COLUMN "emailSourceType" TEXT,
ADD COLUMN "personalizationSourceUrl" TEXT,
ADD COLUMN "personalizationCheckedAt" TIMESTAMP(3),
ADD COLUMN "followerCount" INTEGER,
ADD COLUMN "followerCountVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "qualificationStatus" "QualificationStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
ADD COLUMN "qualificationEvidenceUrl" TEXT,
ADD COLUMN "qualificationCheckedAt" TIMESTAMP(3),
ADD COLUMN "replyReceivedAt" TIMESTAMP(3),
ADD COLUMN "hardBouncedAt" TIMESTAMP(3),
ADD COLUMN "optedOutAt" TIMESTAMP(3),
ADD COLUMN "campaignStartedAt" TIMESTAMP(3),
ADD COLUMN "campaignCompletedAt" TIMESTAMP(3),
ADD COLUMN "commissionAmount" DOUBLE PRECISION,
ADD COLUMN "followUpStage" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "nextFollowUpAt" TIMESTAMP(3),
ADD COLUMN "lastContactedAt" TIMESTAMP(3),
ADD COLUMN "suppressionReason" TEXT;

ALTER TABLE "OutreachMessage"
ADD COLUMN "htmlBody" TEXT,
ADD COLUMN "followUpNumber" INTEGER NOT NULL DEFAULT 0;
