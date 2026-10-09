-- CreateEnum
CREATE TYPE "QuestionBank" AS ENUM ('PTE', 'TU');

-- AlterEnum
ALTER TYPE "MockTestMode" ADD VALUE 'tu';

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "bank" "QuestionBank" NOT NULL DEFAULT 'PTE';

-- CreateIndex
CREATE INDEX "Question_bank_idx" ON "Question"("bank");
