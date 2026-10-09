-- CreateEnum
CREATE TYPE "ConsultationStatus" AS ENUM ('NEW', 'CONTACTED', 'DONE');

-- CreateTable
CREATE TABLE "ConsultationRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "preferredDate" TIMESTAMP(3) NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "note" TEXT,
    "status" "ConsultationStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsultationRequest_userId_idx" ON "ConsultationRequest"("userId");

-- CreateIndex
CREATE INDEX "ConsultationRequest_status_createdAt_idx" ON "ConsultationRequest"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "ConsultationRequest" ADD CONSTRAINT "ConsultationRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
