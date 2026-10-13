import { daysUntilExpiry, formatVnDateTime } from "@/lib/admin/student-status";
import type { AssignmentKind } from "@/lib/generated/prisma/enums";

/** Nhãn hiển thị cho bài tập phía học viên — hàm thuần, dùng được ở server lẫn client. */

export const ASSIGNMENT_KIND_LABEL: Record<AssignmentKind, string> = {
  PRACTICE: "Luyện đề",
  TU: "Luyện đề Tủ",
  MOCK: "Mock test",
};

export type DueTone = "bad" | "warn" | "normal" | "done";

export interface DueLabel {
  label: string;
  tone: DueTone;
  /** "Hạn nộp HH:MM dd/mm/yyyy" — null nếu không đặt hạn. */
  full: string | null;
}

/** "Quá hạn N ngày" / "Hạn hôm nay" / "Còn N ngày" theo ngày lịch giờ Việt Nam. */
export function dueLabel(
  dueAt: string | null,
  opts: { completed?: boolean; closed?: boolean } = {},
  now: Date = new Date()
): DueLabel {
  const full = dueAt ? `Hạn nộp ${formatVnDateTime(dueAt)}` : null;
  if (opts.completed) return { label: "Đã nộp đủ", tone: "done", full };
  if (opts.closed) return { label: "Đã đóng", tone: "normal", full };
  if (!dueAt) return { label: "Không đặt hạn nộp", tone: "normal", full };

  const due = new Date(dueAt);
  const days = daysUntilExpiry(due, now);
  if (due.getTime() < now.getTime()) {
    const overdue = Math.max(0, -days);
    return { label: overdue >= 1 ? `Quá hạn ${overdue} ngày` : "Đã quá hạn", tone: "bad", full };
  }
  if (days <= 0) return { label: "Hạn hôm nay", tone: "warn", full };
  return { label: `Còn ${days} ngày`, tone: days <= 2 ? "warn" : "normal", full };
}

/** Màu chữ/nền theo tông (bảng màu .rail-theme, chỉ sáng). Cam cảnh báo của
 * rail (#ef6c00) không đủ tương phản làm chữ nên dùng nâu cam #7A4708
 * (6.06:1 trên --rail-warning-tint #ffe0b2, đạt mức 4.5:1 cho chữ thường). */
export const DUE_TONE_STYLE: Record<DueTone, { color: string; background: string }> = {
  bad: { color: "var(--rail-red-text)", background: "var(--rail-red-tint)" },
  warn: { color: "#7a4708", background: "var(--rail-warning-tint)" },
  normal: { color: "var(--rail-ink)", background: "var(--rail-surface)" },
  done: { color: "var(--rail-ok)", background: "var(--rail-ok-tint)" },
};
