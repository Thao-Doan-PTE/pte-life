-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "actorRoles" "Role"[] DEFAULT ARRAY[]::"Role"[],
ADD COLUMN     "after" JSONB,
ADD COLUMN     "before" JSONB,
ADD COLUMN     "ip" TEXT,
ADD COLUMN     "targetUserId" TEXT,
ADD COLUMN     "userAgent" TEXT;

-- AlterTable
ALTER TABLE "Class" ADD COLUMN     "sessionsDone" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sessionsTotal" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "reservedUntil" TIMESTAMP(3),
ADD COLUMN     "targetScore" INTEGER;

-- CreateTable
CREATE TABLE "TeacherProfile" (
    "userId" TEXT NOT NULL,
    "specialty" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "AuditLog_targetUserId_createdAt_idx" ON "AuditLog"("targetUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "TeacherProfile" ADD CONSTRAINT "TeacherProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill (chỉ ghi vào cột mới, không đổi dữ liệu cũ):
-- 1) Nhật ký đổi role / khoá tài khoản cũ: người bị tác động chính là entityId.
UPDATE "AuditLog" a
SET "targetUserId" = a."entityId"
WHERE a."entityType" = 'User'
  AND a."targetUserId" IS NULL
  AND EXISTS (SELECT 1 FROM "User" u WHERE u."id" = a."entityId");

-- 2) Điểm mục tiêu lấy từ form Test đầu vào gần nhất cùng email (vd "65+" → 65;
--    câu trả lời không phải số như "Chưa rõ" thì để trống).
UPDATE "User" u
SET "targetScore" = substring(l."targetScore" from '^[0-9]+')::int
FROM (
  SELECT DISTINCT ON (lower("email")) lower("email") AS email_lc, "targetScore"
  FROM "EntryTestLead"
  WHERE "email" IS NOT NULL
  ORDER BY lower("email"), "createdAt" DESC
) l
WHERE lower(u."email") = l.email_lc
  AND l."targetScore" ~ '^[0-9]+'
  AND u."targetScore" IS NULL;
