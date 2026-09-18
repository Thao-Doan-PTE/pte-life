-- CreateEnum
CREATE TYPE "ExamPackage" AS ENUM ('academic', 'core');

-- CreateEnum
CREATE TYPE "Skill" AS ENUM ('speaking', 'writing', 'reading', 'listening');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "examPackage" "ExamPackage" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "reservationsLeft" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "questionTypeId" TEXT NOT NULL,
    "skill" "Skill" NOT NULL,
    "code" TEXT NOT NULL,
    "availableIn" "ExamPackage"[],
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Question_code_key" ON "Question"("code");

-- CreateIndex
CREATE INDEX "Question_questionTypeId_idx" ON "Question"("questionTypeId");
