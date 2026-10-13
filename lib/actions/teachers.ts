"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/admin/audit";
import { requireCapability } from "@/lib/admin/permissions";

/** File "use server": mọi hàm export là endpoint HTTP công khai — tự kiểm tra quyền. */

export type TeacherFormState = { error?: string; success?: string } | null;

const SPECIALTY_MAX = 100;

/** Sửa "Chuyên môn" của giáo viên (trang Giáo viên, HANDOFF mục 4.7) — Admin /
 * Trưởng học thuật. Để trống = xoá chuyên môn. */
export async function setTeacherSpecialtyAction(formData: FormData): Promise<TeacherFormState> {
  const user = await requireCapability("viewTeachers");

  const teacherIdRaw = formData.get("teacherId");
  const specialtyRaw = formData.get("specialty");
  const teacherId = typeof teacherIdRaw === "string" ? teacherIdRaw.trim() : "";
  if (!teacherId) return { error: "Thiếu giáo viên cần sửa." };
  if (specialtyRaw !== null && typeof specialtyRaw !== "string") return { error: "Chuyên môn không hợp lệ." };
  // Gộp khoảng trắng/xuống dòng thừa thành 1 dấu cách.
  const specialty = (specialtyRaw ?? "").replace(/\s+/g, " ").trim();
  if (specialty.length > SPECIALTY_MAX) return { error: `Chuyên môn tối đa ${SPECIALTY_MAX} ký tự.` };

  const teacher = await prisma.user.findUnique({
    where: { id: teacherId },
    select: { id: true, name: true, roles: true, teacherProfile: { select: { specialty: true } } },
  });
  if (!teacher || !teacher.roles.includes("TEACHER")) {
    return { error: "Người dùng này không có role Giáo viên." };
  }

  const before = teacher.teacherProfile?.specialty ?? null;
  const after = specialty || null;
  if (before === after) return { success: "Không có thay đổi." };

  await prisma.$transaction(async (tx) => {
    await tx.teacherProfile.upsert({
      where: { userId: teacherId },
      update: { specialty: after },
      create: { userId: teacherId, specialty: after },
    });
    await writeAuditLog(
      {
        actor: { id: user.id, roles: user.roles },
        action: "set_teacher_specialty",
        entityType: "TeacherProfile",
        entityId: teacherId,
        targetUserId: teacherId,
        detail: `Cập nhật chuyên môn giáo viên ${teacher.name}: ${before ?? "—"} → ${after ?? "—"}`,
        before: { specialty: before },
        after: { specialty: after },
      },
      tx
    );
  });

  revalidatePath("/admin/teachers");
  return { success: after ? "Đã lưu chuyên môn." : "Đã xoá chuyên môn." };
}
