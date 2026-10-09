-- CreateEnum
CREATE TYPE "EntryTestPurpose" AS ENUM ('DU_HOC', 'DINH_CU', 'XIN_VIEC', 'KHAC');

-- CreateTable
CREATE TABLE "EntryTestLead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "targetScore" TEXT NOT NULL,
    "purpose" "EntryTestPurpose" NOT NULL,
    "examTimeline" TEXT NOT NULL,
    "consentAt" TIMESTAMP(3) NOT NULL,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntryTestLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EntryTestLead_createdAt_idx" ON "EntryTestLead"("createdAt");
