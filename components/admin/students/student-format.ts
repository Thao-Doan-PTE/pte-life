import type { StudentRow } from "@/lib/admin/student-queries";

/** "Đầu vào → mục tiêu": trình độ từ test đầu vào gần nhất (nhãn trình độ, không
 * có thì điểm) → điểm mục tiêu riêng của học viên, không có thì của lớp đang học.
 * Thiếu cả hai → "—". */
export function entryTargetLabel(row: StudentRow): string {
  const entry = row.entryTest?.levelShort ?? (row.entryTest?.scoreTotal != null ? String(row.entryTest.scoreTotal) : null);
  const target = row.target?.score ?? null;
  if (!entry && target === null) return "—";
  return `${entry ?? "—"} → ${target ?? "—"}`;
}

/** Nguồn của điểm mục tiêu, VD "Mục tiêu riêng" / "Mục tiêu lớp AC-K12". */
export function targetSourceLabel(row: StudentRow): string {
  if (!row.target) return "Chưa có mục tiêu";
  return row.target.source === "student" ? "Mục tiêu riêng" : `Mục tiêu lớp ${row.target.classCode ?? ""}`.trim();
}

/** Số ngày dùng thử Luyện đề Tủ được chọn — nguồn DUY NHẤT: lib/actions/admin.ts
 * import chính hằng số này để kiểm tra lại và dựng câu báo lỗi (file này chỉ
 * import type nên dùng được ở cả client lẫn server action). Sắp tăng dần. */
export const TU_TRIAL_DAY_CHOICES = [7, 14, 30, 60, 90] as const;

/** Tối đa số học viên mỗi lần mời / tắt dùng thử hàng loạt (server dùng chung). */
export const TU_TRIAL_BULK_MAX = 200;

/** Nội dung ghi chú phạm vi dùng thử (drawer + bộ lọc). */
export const TU_TRIAL_SCOPE_NOTE = "Chỉ mở bộ đề Tủ (WFD, RS) và thi thử Đề Tủ; các phần khác vẫn cần xếp lớp.";

/** Nhãn lớp kèm giáo viên chính, VD "AC-K12 · Nguyễn Lan". */
export function classWithTeacher(row: StudentRow): string | null {
  const c = row.activeClass;
  if (!c) return null;
  return c.teacherName ? `${c.code} · ${c.teacherName}` : c.code;
}
