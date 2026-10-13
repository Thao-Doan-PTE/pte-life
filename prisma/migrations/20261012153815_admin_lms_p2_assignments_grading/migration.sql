-- CreateEnum
CREATE TYPE "AssignmentKind" AS ENUM ('PRACTICE', 'TU', 'MOCK');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('OPEN', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'GRADED');

-- AlterTable
ALTER TABLE "MockTestSession" ADD COLUMN     "assignmentId" TEXT;

-- AlterTable
ALTER TABLE "PracticeAttempt" ADD COLUMN     "assignmentId" TEXT,
ADD COLUMN     "audioUrl" TEXT,
ADD COLUMN     "reviewStatus" "ReviewStatus";

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "source" TEXT;

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "AssignmentKind" NOT NULL,
    "questionTypeIds" TEXT[],
    "note" TEXT,
    "dueAt" TIMESTAMP(3),
    "notify" BOOLEAN NOT NULL DEFAULT false,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentItem" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AssignmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentRecipient" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AssignmentRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradingRubric" (
    "id" TEXT NOT NULL,
    "questionTypeId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "criteria" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GradingRubric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttemptGrade" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "rubricId" TEXT,
    "criteria" JSONB NOT NULL,
    "total" INTEGER NOT NULL,
    "maxTotal" INTEGER NOT NULL,
    "comment" TEXT,
    "gradedById" TEXT NOT NULL,
    "gradedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttemptGrade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Assignment_classId_status_idx" ON "Assignment"("classId", "status");

-- CreateIndex
CREATE INDEX "Assignment_dueAt_idx" ON "Assignment"("dueAt");

-- CreateIndex
CREATE INDEX "AssignmentItem_questionId_idx" ON "AssignmentItem"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentItem_assignmentId_questionId_key" ON "AssignmentItem"("assignmentId", "questionId");

-- CreateIndex
CREATE INDEX "AssignmentRecipient_studentId_idx" ON "AssignmentRecipient"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentRecipient_assignmentId_studentId_key" ON "AssignmentRecipient"("assignmentId", "studentId");

-- CreateIndex
CREATE INDEX "GradingRubric_questionTypeId_isActive_idx" ON "GradingRubric"("questionTypeId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "GradingRubric_questionTypeId_version_key" ON "GradingRubric"("questionTypeId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "AttemptGrade_attemptId_key" ON "AttemptGrade"("attemptId");

-- CreateIndex
CREATE INDEX "AttemptGrade_gradedById_idx" ON "AttemptGrade"("gradedById");

-- CreateIndex
CREATE INDEX "MockTestSession_assignmentId_idx" ON "MockTestSession"("assignmentId");

-- CreateIndex
CREATE INDEX "PracticeAttempt_assignmentId_idx" ON "PracticeAttempt"("assignmentId");

-- CreateIndex
CREATE INDEX "PracticeAttempt_reviewStatus_createdAt_idx" ON "PracticeAttempt"("reviewStatus", "createdAt");

-- AddForeignKey
ALTER TABLE "MockTestSession" ADD CONSTRAINT "MockTestSession_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeAttempt" ADD CONSTRAINT "PracticeAttempt_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentItem" ADD CONSTRAINT "AssignmentItem_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentItem" ADD CONSTRAINT "AssignmentItem_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentRecipient" ADD CONSTRAINT "AssignmentRecipient_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentRecipient" ADD CONSTRAINT "AssignmentRecipient_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptGrade" ADD CONSTRAINT "AttemptGrade_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "PracticeAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptGrade" ADD CONSTRAINT "AttemptGrade_rubricId_fkey" FOREIGN KEY ("rubricId") REFERENCES "GradingRubric"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptGrade" ADD CONSTRAINT "AttemptGrade_gradedById_fkey" FOREIGN KEY ("gradedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
