-- Store screenshot-visible context separately from contact evidence so a
-- recruiter can review it before it is used in an outreach draft.
ALTER TABLE "Prospect"
ADD COLUMN "profileBio" TEXT,
ADD COLUMN "creatorCategory" TEXT,
ADD COLUMN "personalizationHook" TEXT;
