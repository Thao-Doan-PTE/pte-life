import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasAnyRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/generated/prisma/enums";

/** Phân quyền Admin LMS (docs/pte-admin-lms-handoff/HANDOFF.md mục 3).
 * Ánh xạ vai trò: Admin = ADMIN, Vận hành/CSKH = OPS, Giáo viên = TEACHER.
 * ACADEMIC_LEAD (trưởng học thuật) không có trong tài liệu — tạm cho quyền như
 * Admin ở phần đào tạo/nội dung (lớp, giáo viên, test đầu vào, xem ngân hàng
 * đề), không có quyền gói học/nhật ký/người dùng.
 * Một user có thể mang nhiều role → quyền là hợp của các role.
 * Mọi trang và mọi server action PHẢI tự gọi requireCapability/requireAdminPage —
 * layout và menu chỉ để hiển thị, không phải lớp bảo vệ. */

export const STAFF_ROLES: Role[] = ["ADMIN", "OPS", "ACADEMIC_LEAD", "TEACHER"];

export const CAPABILITIES = {
  /** Trang Tổng quan (giáo viên chỉ thấy số liệu lớp mình). */
  viewOverview: ["ADMIN", "OPS", "ACADEMIC_LEAD", "TEACHER"],
  /** Xem danh sách học viên & gói học. */
  viewStudents: ["ADMIN", "OPS"],
  /** Đổi gói, gia hạn, dùng lượt bảo lưu. */
  managePlans: ["ADMIN", "OPS"],
  /** Xếp học viên vào lớp / gỡ khỏi lớp. */
  placeStudents: ["ADMIN", "OPS", "ACADEMIC_LEAD"],
  /** Xem kết quả test đầu vào. */
  viewEntryTests: ["ADMIN", "OPS", "ACADEMIC_LEAD", "TEACHER"],
  /** Xem lớp học (giáo viên chỉ lớp mình). */
  viewClasses: ["ADMIN", "OPS", "ACADEMIC_LEAD", "TEACHER"],
  /** Tạo/lưu trữ lớp, phân công giáo viên. */
  manageClasses: ["ADMIN", "OPS", "ACADEMIC_LEAD"],
  /** Danh sách giáo viên & khối lượng. */
  viewTeachers: ["ADMIN", "ACADEMIC_LEAD"],
  /** Xem ngân hàng đề. */
  viewQuestionBank: ["ADMIN", "ACADEMIC_LEAD", "TEACHER"],
  /** Nhập/xoá câu hỏi (tải file 22 dạng). */
  editQuestionBank: ["ADMIN"],
  /** Giao bài tập cho lớp (giáo viên chỉ lớp mình). */
  manageAssignments: ["ADMIN", "ACADEMIC_LEAD", "TEACHER"],
  /** Chấm bài Speaking/Writing (giáo viên chỉ bài của học viên lớp mình). */
  gradeSubmissions: ["ADMIN", "ACADEMIC_LEAD", "TEACHER"],
  /** Sửa rubric chấm. */
  editRubrics: ["ADMIN", "ACADEMIC_LEAD"],
  /** Nhật ký thao tác. */
  viewLogs: ["ADMIN", "OPS"],
  /** Người dùng & phân quyền. */
  manageUsers: ["ADMIN"],
} as const satisfies Record<string, Role[]>;

export type Capability = keyof typeof CAPABILITIES;

type RoleBearer = { roles: Role[] } | null | undefined;

export function can(user: RoleBearer, capability: Capability): boolean {
  return hasAnyRole(user, [...CAPABILITIES[capability]]);
}

export function isStaff(user: RoleBearer): boolean {
  return hasAnyRole(user, STAFF_ROLES);
}

/** Giáo viên thuần (không có role vận hành/admin) — dữ liệu bị giới hạn theo lớp mình. */
export function isTeacherOnly(user: RoleBearer): boolean {
  return hasAnyRole(user, ["TEACHER"]) && !hasAnyRole(user, ["ADMIN", "OPS", "ACADEMIC_LEAD"]);
}

/** Dùng trong server action: ném lỗi nếu không đủ quyền. */
export async function requireCapability(capability: Capability) {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !can(user, capability)) {
    throw new Error("Bạn không có quyền thực hiện thao tác này.");
  }
  return user;
}

/** Dùng ở đầu mỗi trang admin: chưa đăng nhập → /login; không phải nhân viên →
 * trang chủ; nhân viên nhưng thiếu quyền trang này → về Tổng quan. */
export async function requireAdminPage(capability: Capability) {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) redirect("/login?callbackUrl=/admin");
  if (!isStaff(user)) redirect("/");
  if (!can(user, capability)) redirect("/admin");
  return user;
}

/** Vai trò được dùng quyền trên MỌI lớp, theo từng quyền có giới hạn lớp. Vai trò
 * có quyền nhưng không nằm trong danh sách (vd. TEACHER) chỉ dùng được trên lớp
 * mình được phân công. Phạm vi phụ thuộc quyền chứ không chỉ phụ thuộc người dùng:
 * tài khoản OPS + TEACHER xem mọi lớp (nhờ OPS) nhưng chỉ chấm bài / giao bài cho
 * lớp mình (OPS không có quyền chấm/giao bài, quyền đó đến từ TEACHER). */
export const UNSCOPED_ROLES = {
  gradeSubmissions: ["ADMIN", "ACADEMIC_LEAD"],
  manageAssignments: ["ADMIN", "ACADEMIC_LEAD"],
  viewClasses: ["ADMIN", "OPS", "ACADEMIC_LEAD"],
  viewEntryTests: ["ADMIN", "OPS", "ACADEMIC_LEAD"],
  viewOverview: ["ADMIN", "OPS", "ACADEMIC_LEAD"],
} as const satisfies Partial<Record<Capability, Role[]>>;

export type ScopedCapability = keyof typeof UNSCOPED_ROLES;

/** Người dùng có quyền `capability` trên mọi lớp (không bị giới hạn theo lớp). */
export function hasUnscopedAccess(user: RoleBearer, capability: ScopedCapability): boolean {
  return can(user, capability) && hasAnyRole(user, [...UNSCOPED_ROLES[capability]]);
}

/** Phạm vi lớp khi dùng quyền `capability`. null = mọi lớp (chỉ khi người dùng có
 * vai trò không giới hạn của quyền đó); ngược lại = id các lớp được phân công
 * (MAIN hoặc ASSISTANT), có thể rỗng. Không có quyền → [] (không lớp nào). */
export async function getScopedClassIdsFor(
  user: { id: string; roles: Role[] },
  capability: ScopedCapability
): Promise<string[] | null> {
  if (!can(user, capability)) return [];
  if (hasUnscopedAccess(user, capability)) return null;
  const rows = await prisma.classTeacher.findMany({ where: { teacherId: user.id }, select: { classId: true } });
  return rows.map((r) => r.classId);
}

/** Phạm vi lớp khi xem lớp học (viewClasses). null = không giới hạn (người dùng
 * có quyền xem mọi lớp). Chấm bài / giao bài phải dùng getScopedClassIdsFor với
 * đúng quyền — phạm vi xem lớp rộng hơn phạm vi chấm/giao bài. */
export async function getScopedClassIds(user: { id: string; roles: Role[] }): Promise<string[] | null> {
  return getScopedClassIdsFor(user, "viewClasses");
}

/** Nhãn vai trò hiển thị trên giao diện (ưu tiên vai trò cao nhất). */
export function staffRoleLabel(user: RoleBearer): string {
  if (hasAnyRole(user, ["ADMIN"])) return "Quản trị";
  if (hasAnyRole(user, ["ACADEMIC_LEAD"])) return "Trưởng học thuật";
  if (hasAnyRole(user, ["OPS"])) return "Vận hành / CSKH";
  if (hasAnyRole(user, ["TEACHER"])) return "Giáo viên";
  return "";
}
