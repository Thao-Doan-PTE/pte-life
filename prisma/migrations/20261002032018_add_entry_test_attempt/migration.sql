-- CreateEnum
CREATE TYPE "EntryTestAttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'GRADED');

-- CreateTable
CREATE TABLE "EntryTestAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "autoSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "scoreAuto" INTEGER,
    "scoreSpeaking" INTEGER,
    "scoreTotal" INTEGER,
    "level" TEXT,
    "status" "EntryTestAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "gradedById" TEXT,
    "gradedAt" TIMESTAMP(3),

    CONSTRAINT "EntryTestAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntryTestAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "responseText" TEXT,
    "audioUrl" TEXT,
    "isCorrect" BOOLEAN,
    "pointsAwarded" INTEGER,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntryTestAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EntryTestAttempt_userId_idx" ON "EntryTestAttempt"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EntryTestAnswer_attemptId_questionId_key" ON "EntryTestAnswer"("attemptId", "questionId");

-- AddForeignKey
ALTER TABLE "EntryTestAttempt" ADD CONSTRAINT "EntryTestAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryTestAttempt" ADD CONSTRAINT "EntryTestAttempt_gradedById_fkey" FOREIGN KEY ("gradedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryTestAnswer" ADD CONSTRAINT "EntryTestAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "EntryTestAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
