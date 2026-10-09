-- CreateTable
CREATE TABLE "SavedWord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "phonetic" TEXT,
    "meaningVi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedWord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedWord_userId_idx" ON "SavedWord"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedWord_userId_word_key" ON "SavedWord"("userId", "word");

-- AddForeignKey
ALTER TABLE "SavedWord" ADD CONSTRAINT "SavedWord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
