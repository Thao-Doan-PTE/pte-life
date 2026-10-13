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

/** Nhãn lớp kèm giáo viên chính, VD "AC-K12 · Nguyễn Lan". */
export function classWithTeacher(row: StudentRow): string | null {
  const c = row.activeClass;
  if (!c) return null;
  return c.teacherName ? `${c.code} · ${c.teacherName}` : c.code;
}
