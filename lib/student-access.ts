import { auth } from "@/auth";
import { hasAnyRole, hasRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/generated/prisma/enums";

/** Mức quyền vào khu vực luyện tập của 1 tài khoản:
 * - "staff": tài khoản nội bộ (không mang role STUDENT) — vào được mọi phần.
 * - "class": học viên đang học 1 lớp — vào được mọi phần luyện tập.
 * - "tu-trial": chưa có lớp nhưng nằm trong danh sách mời dùng thử Luyện đề Tủ
 *   (User.tuTrialUntil còn hạn) — CHỈ được bộ đề Tủ (WFD, RS bank TU) và thi thử Đề Tủ.
 * - "none": chưa có lớp, không được mời — chỉ làm Test đầu vào. */
export type StudentAccess = "staff" | "class" | "tu-trial" | "none";

/** Dạng bài có trong bộ đề Tủ — dùng để chặn người dùng thử ra ngoài bộ Tủ. */
export const TU_TRIAL_TYPE_IDS = ["write-from-dictation", "repeat-sentence"] as const;

const STAFF_ROLES: Role[] = ["ADMIN", "OPS", "ACADEMIC_LEAD", "TEACHER"];

/** Còn hạn dùng thử Tủ (tính tới hết ngày đã đặt). */
export function isTuTrialActive(tuTrialUntil: Date | string | null | undefined, now: Date = new Date()): boolean {
  return tuTrialUntil != null && new Date(tuTrialUntil).getTime() >= now.getTime();
}

/** Câu hỏi thuộc bộ đề Tủ mà người dùng thử được làm. */
export function isTuTrialQuestion(question: { bank: string; questionTypeId: string }): boolean {
  return question.bank === "TU" && (TU_TRIAL_TYPE_IDS as readonly string[]).includes(question.questionTypeId);
}

/** Mức quyền cho trang (page/layout): tài khoản nội bộ không mang role STUDENT
 * là "staff"; còn lại xét lớp học rồi tới danh sách dùng thử Tủ. */
export async function getStudentAccess(user: { id: string; roles: Role[] }): Promise<StudentAccess> {
  if (!hasRole(user, "STUDENT") && hasAnyRole(user, STAFF_ROLES)) return "staff";
  const [enrollment, row] = await Promise.all([
    prisma.classEnrollment.findFirst({ where: { studentId: user.id, status: "ACTIVE" }, select: { id: true } }),
    prisma.user.findUnique({ where: { id: user.id }, select: { tuTrialUntil: true } }),
  ]);
  if (enrollment) return "class";
  return isTuTrialActive(row?.tuTrialUntil) ? "tu-trial" : "none";
}

/** Dùng trong server action luyện tập: phải đăng nhập và có quyền "staff",
 * "class" hoặc "tu-trial" (người dùng thử phải được kiểm tra tiếp bằng
 * assertQuestionAllowed sau khi tải câu hỏi). Tài khoản nội bộ (mọi role
 * nhân viên) luôn được dùng. */
export async function requireAnyPracticeAccess() {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) throw new Error("Bạn cần đăng nhập.");
  if (hasAnyRole(user, STAFF_ROLES)) return { user, access: "staff" as StudentAccess };
  const access = await getStudentAccess(user);
  if (access === "none") throw new Error("Tính năng này dành cho học viên đang học tại PTE-Life.");
  return { user, access };
}

/** Người dùng thử Tủ chỉ được làm câu thuộc bộ đề Tủ. */
export function assertQuestionAllowed(access: StudentAccess, question: { bank: string; questionTypeId: string }) {
  if (access === "tu-trial" && !isTuTrialQuestion(question)) {
    throw new Error("Tài khoản dùng thử chỉ luyện được bộ đề Tủ.");
  }
}

/** Tài khoản đang trong danh sách mời dùng thử Luyện đề Tủ (còn hạn). */
export async function hasTuTrialAccess(userId: string): Promise<boolean> {
  const row = await prisma.user.findUnique({ where: { id: userId }, select: { tuTrialUntil: true } });
  return isTuTrialActive(row?.tuTrialUntil);
}
