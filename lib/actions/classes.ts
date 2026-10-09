"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole, hasAnyRole } from "@/lib/auth-helpers";
import type { ExamPackage } from "@/lib/question-types";

const OPS_ROLES = ["ADMIN", "OPS", "ACADEMIC_LEAD"] as const;

async function logAudit(actorId: string, action: string, entityType: string, entityId: string, detail: string) {
  await prisma.auditLog.create({ data: { actorId, action, entityType, entityId, detail } });
}

/** A3 — Lớp học: ADMIN/OPS/ACADEMIC_LEAD thấy mọi lớp, TEACHER chỉ thấy lớp
 * mình được phân công (mục 2.2 spec: TEACHER truy cập lớp không thuộc mình → 403). */
export async function getClassesForCurrentUser() {
  const user = await requireRole([...OPS_ROLES, "TEACHER"]);
  const where = hasAnyRole(user, [...OPS_ROLES]) ? {} : { teachers: { some: { teacherId: user.id } } };

  return prisma.class.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      teachers: { include: { teacher: { select: { id: true, name: true, email: true } } } },
      _count: { select: { enrollments: true } },
    },
  });
}

export async function getClassDetail(classId: string) {
  const user = await requireRole([...OPS_ROLES, "TEACHER"]);
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      teachers: { include: { teacher: { select: { id: true, name: true, email: true } } } },
      enrollments: {
        include: { student: { select: { id: true, name: true, email: true, examPackage: true, status: true } } },
        orderBy: { joinedAt: "asc" },
      },
    },
  });
  if (!cls) return null;

  if (!hasAnyRole(user, [...OPS_ROLES]) && !cls.teachers.some((t) => t.teacherId === user.id)) {
    throw new Error("Bạn không có quyền xem lớp này.");
  }
  return cls;
}

export async function createClassAction(formData: FormData) {
  const user = await requireRole([...OPS_ROLES]);
  const code = (formData.get("code") as string).trim();
  const name = (formData.get("name") as string).trim();
  const examType = formData.get("examType") as ExamPackage;
  const targetScoreRaw = formData.get("targetScore") as string;
  const schedule = (formData.get("schedule") as string) || null;

  const cls = await prisma.class.create({
    data: {
      code,
      name,
      examType,
      targetScore: targetScoreRaw ? Number(targetScoreRaw) : null,
      schedule,
      createdById: user.id,
    },
  });
  await logAudit(user.id, "create_class", "Class", cls.id, `Tạo lớp ${cls.code} — ${cls.name}`);
  revalidatePath("/admin/classes");
  redirect(`/admin/classes/${cls.id}`);
}

export async function archiveClassAction(formData: FormData) {
  const user = await requireRole([...OPS_ROLES]);
  const classId = formData.get("classId") as string;

  await prisma.class.update({ where: { id: classId }, data: { status: "ARCHIVED" } });
  await logAudit(user.id, "archive_class", "Class", classId, "Lưu trữ lớp");
  revalidatePath("/admin/classes");
  revalidatePath(`/admin/classes/${classId}`);
}

export async function assignTeacherAction(formData: FormData) {
  const user = await requireRole([...OPS_ROLES]);
  const classId = formData.get("classId") as string;
  const teacherId = formData.get("teacherId") as string;

  const teacher = await prisma.user.findUnique({ where: { id: teacherId } });
  if (!teacher || !teacher.roles.includes("TEACHER")) {
    throw new Error("User này không có role TEACHER.");
  }

  await prisma.classTeacher.upsert({
    where: { classId_teacherId: { classId, teacherId } },
    update: {},
    create: { classId, teacherId },
  });
  await logAudit(user.id, "assign_teacher", "Class", classId, `Gán giáo viên ${teacher.name} (${teacher.email})`);
  revalidatePath(`/admin/classes/${classId}`);
}

export async function removeTeacherAction(formData: FormData) {
  const user = await requireRole([...OPS_ROLES]);
  const classId = formData.get("classId") as string;
  const teacherId = formData.get("teacherId") as string;

  await prisma.classTeacher.delete({ where: { classId_teacherId: { classId, teacherId } } });
  await logAudit(user.id, "remove_teacher", "Class", classId, `Bỏ giáo viên khỏi lớp (userId: ${teacherId})`);
  revalidatePath(`/admin/classes/${classId}`);
}

export async function enrollStudentAction(formData: FormData) {
  const user = await requireRole([...OPS_ROLES]);
  const classId = formData.get("classId") as string;
  const studentId = formData.get("studentId") as string;

  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (!student || !student.roles.includes("STUDENT")) {
    throw new Error("User này không có role STUDENT.");
  }

  await prisma.classEnrollment.upsert({
    where: { classId_studentId: { classId, studentId } },
    update: { status: "ACTIVE", leftAt: null },
    create: { classId, studentId },
  });
  await logAudit(user.id, "enroll_student", "Class", classId, `Thêm học viên ${student.name} (${student.email})`);
  revalidatePath(`/admin/classes/${classId}`);
}

export async function removeEnrollmentAction(formData: FormData) {
  const user = await requireRole([...OPS_ROLES]);
  const classId = formData.get("classId") as string;
  const studentId = formData.get("studentId") as string;

  await prisma.classEnrollment.update({
    where: { classId_studentId: { classId, studentId } },
    data: { status: "LEFT", leftAt: new Date() },
  });
  await logAudit(user.id, "remove_enrollment", "Class", classId, `Bỏ học viên khỏi lớp (userId: ${studentId})`);
  revalidatePath(`/admin/classes/${classId}`);
}
