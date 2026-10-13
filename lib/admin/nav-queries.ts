import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { EXPIRING_SOON_DAYS } from "@/lib/admin/student-status";

/** Số việc tồn hiện trên menu Admin + các điều kiện lọc dùng chung với trang
 * Tổng quan (lib/admin/overview-queries.ts) để badge và KPI luôn ra cùng một số.
 * Chỉ gọi sau khi đã kiểm tra quyền xem mục tương ứng. */

const DAY_MS = 24 * 60 * 60 * 1000;
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/** 0h (giờ Việt Nam) của ngày lịch cách hôm nay offsetDays ngày. */
export function startOfVnDay(now: Date, offsetDays: number): Date {
  const vnDay = Math.floor((now.getTime() + VN_OFFSET_MS) / DAY_MS);
  return new Date((vnDay + offsetDays) * DAY_MS - VN_OFFSET_MS);
}

/** Điều kiện "hết hạn / sắp hết hạn ≤ 14 ngày" — dùng chung cho badge menu,
 * KPI, số việc và danh sách trên Tổng quan để mọi chỗ luôn cùng một tập người.
 * - Mốc tính theo ngày lịch giờ VN, khớp getStudentStatus: daysUntilExpiry ≤ 14
 *   ⇔ expiresAt trước 0h ngày thứ 15 kể từ hôm nay.
 * - Chỉ tính người từng được xếp lớp (quyết định 9A): tài khoản tự đăng ký / tạo
 *   từ Test đầu vào chưa từng học là khách tiềm năng, nằm ở màn Test đầu vào.
 * - Bỏ người đang bảo lưu (reservedUntil còn trong tương lai, quyết định 5B):
 *   trạng thái của họ là "Bảo lưu đến …" (HANDOFF mục 5 — ưu tiên trước "Hết hạn"
 *   / "Còn N ngày"), không phải việc gia hạn cần xử lý. */
export function expiringStudentsWhere(now: Date = new Date()): Prisma.UserWhereInput {
  return {
    roles: { has: "STUDENT" },
    status: "ACTIVE",
    expiresAt: { lt: startOfVnDay(now, EXPIRING_SOON_DAYS + 1) },
    classEnrollments: { some: {} },
    OR: [{ reservedUntil: null }, { reservedUntil: { lte: now } }],
  };
}

/** Học viên đã hết hạn hoặc còn ≤ 14 ngày (cùng điều kiện với Tổng quan). */
export async function countExpiringStudents(now: Date = new Date()): Promise<number> {
  return prisma.user.count({ where: expiringStudentsWhere(now) });
}

/** Người đã nộp test đầu vào nhưng chưa được xếp vào lớp nào đang học. */
export async function countUnplacedEntryTests(): Promise<number> {
  return prisma.user.count({
    where: {
      status: "ACTIVE",
      entryTestAttempts: { some: { status: { in: ["SUBMITTED", "GRADED"] } } },
      classEnrollments: { none: { status: "ACTIVE" } },
    },
  });
}

/** Điều kiện "bài chờ giáo viên chấm" trong phạm vi lớp: chỉ bài thuộc bài tập
 * được giao (quyết định 12A — khớp hàng chờ ở /admin/grading). classIds = null:
 * mọi lớp; mảng: chỉ bài tập của các lớp đó (giáo viên thuần). Mảng rỗng → gọi
 * hàm đếm/list sẽ trả 0 trước khi truy vấn. */
export function pendingGradingWhere(classIds: string[] | null): Prisma.PracticeAttemptWhereInput {
  return {
    reviewStatus: "PENDING",
    assignmentId: { not: null },
    ...(classIds ? { assignment: { is: { classId: { in: classIds } } } } : {}),
  };
}

/** Bài chờ giáo viên chấm. classIds = null: mọi lớp; mảng: chỉ các lớp đó (giáo viên). */
export async function countPendingGrading(classIds: string[] | null): Promise<number> {
  if (classIds && classIds.length === 0) return 0;
  return prisma.practiceAttempt.count({ where: pendingGradingWhere(classIds) });
}
