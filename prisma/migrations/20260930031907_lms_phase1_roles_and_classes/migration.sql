-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'OPS', 'ACADEMIC_LEAD', 'TEACHER', 'STUDENT');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ClassStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'FINISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ClassTeacherRole" AS ENUM ('MAIN', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "ClassEnrollmentStatus" AS ENUM ('ACTIVE', 'PAUSED', 'LEFT');

-- AlterTable: add the new columns first, keep old "role" column around for now
ALTER TABLE "User" ADD COLUMN     "roles" "Role"[] DEFAULT ARRAY['STUDENT']::"Role"[],
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

-- Data migration: convert legacy single "role" enum into the new "roles" array
-- before dropping the old column, so existing accounts (student/admin) keep
-- their permissions instead of silently resetting to the default.
UPDATE "User" SET "roles" = CASE "role"::text
  WHEN 'admin' THEN ARRAY['ADMIN']::"Role"[]
  WHEN 'student' THEN ARRAY['STUDENT']::"Role"[]
  ELSE ARRAY['STUDENT']::"Role"[]
END;

-- AlterTable: now safe to drop the legacy column + its enum type
ALTER TABLE "User" DROP COLUMN "role";

-- DropEnum
DROP TYPE "UserRole";

-- CreateTable
CREATE TABLE "Class" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "examType" "ExamPackage" NOT NULL,
    "targetScore" INTEGER,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "schedule" TEXT,
    "meetingUrl" TEXT,
    "status" "ClassStatus" NOT NULL DEFAULT 'UPCOMING',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassTeacher" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "role" "ClassTeacherRole" NOT NULL DEFAULT 'MAIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassTeacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassEnrollment" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "ClassEnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "ClassEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Class_code_key" ON "Class"("code");

-- CreateIndex
CREATE INDEX "ClassTeacher_teacherId_idx" ON "ClassTeacher"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassTeacher_classId_teacherId_key" ON "ClassTeacher"("classId", "teacherId");

-- CreateIndex
CREATE INDEX "ClassEnrollment_studentId_idx" ON "ClassEnrollment"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassEnrollment_classId_studentId_key" ON "ClassEnrollment"("classId", "studentId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTeacher" ADD CONSTRAINT "ClassTeacher_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTeacher" ADD CONSTRAINT "ClassTeacher_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassEnrollment" ADD CONSTRAINT "ClassEnrollment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassEnrollment" ADD CONSTRAINT "ClassEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
