import type { ClassStatus } from "@/lib/generated/prisma/enums";

/** Nhãn + màu pill cho trạng thái lớp (dùng chung trang Lớp học, chi tiết lớp, Giáo viên). */
export const CLASS_STATUS_META: Record<ClassStatus, { label: string; tone: "ok" | "plum" | "mute" }> = {
  ACTIVE: { label: "Đang học", tone: "ok" },
  UPCOMING: { label: "Sắp khai giảng", tone: "plum" },
  FINISHED: { label: "Đã kết thúc", tone: "mute" },
  ARCHIVED: { label: "Lưu trữ", tone: "mute" },
};

/** Thứ tự hiển thị: lớp đang học trước, rồi sắp khai giảng, cuối cùng lớp đã đóng. */
export const CLASS_STATUS_ORDER: Record<ClassStatus, number> = {
  ACTIVE: 0,
  UPCOMING: 1,
  FINISHED: 2,
  ARCHIVED: 3,
};

/** Lớp còn hoạt động (tính khối lượng giáo viên, cho phép xếp thêm học viên). */
export function isOpenClassStatus(status: ClassStatus): boolean {
  return status === "ACTIVE" || status === "UPCOMING";
}

/** Bộ lọc theo tab trên trang Lớp học (?status=). */
export const CLASS_FILTERS = [
  { key: "active", label: "Đang học", match: (s: ClassStatus) => s === "ACTIVE" },
  { key: "upcoming", label: "Sắp khai giảng", match: (s: ClassStatus) => s === "UPCOMING" },
  { key: "ended", label: "Đã kết thúc", match: (s: ClassStatus) => s === "FINISHED" || s === "ARCHIVED" },
  { key: "all", label: "Tất cả", match: () => true },
] as const;

export type ClassFilterKey = (typeof CLASS_FILTERS)[number]["key"];

/** Số ngày tính "Luyện đề gần đây" trên thẻ lớp / chi tiết lớp. */
export const PRACTICE_WINDOW_DAYS = 7;

export function practiceWindowStart(now: Date = new Date()): Date {
  return new Date(now.getTime() - PRACTICE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}
