import type { AssignmentKind, AssignmentStatus, ClassStatus } from "@/lib/generated/prisma/enums";
import { QUESTION_TYPES } from "@/lib/question-types";

/** Hằng số + hàm thuần cho màn Giao bài tập (HANDOFF §4.5). Không đụng Prisma —
 * dùng được cả ở server (action, trang) lẫn client (form giao bài). */

export const TITLE_MAX = 150;
export const NOTE_MAX = 500;
export const QUANTITY_MIN = 1;
export const QUANTITY_MAX = 100;
export const DEFAULT_QUANTITY = 20;
/** Hạn nộp mặc định trên form: hôm nay + N ngày (giờ Việt Nam). */
export const DEFAULT_DUE_DAYS = 3;
/** Hạn nộp xa nhất: hôm nay + N ngày (chặn năm gõ nhầm, vd. 9999). */
export const DUE_MAX_DAYS = 365;

/** Chỉ lớp đang học / sắp khai giảng mới được giao bài hoặc mở lại bài. */
export const ASSIGNABLE_CLASS_STATUSES: ClassStatus[] = ["ACTIVE", "UPCOMING"];

export function isClassAssignable(status: ClassStatus): boolean {
  return ASSIGNABLE_CLASS_STATUSES.includes(status);
}

/** Chuẩn hoá xuống dòng về "\n" (FormData multipart gửi CRLF) để đếm ký tự khớp
 * với maxLength của textarea. */
export function normalizeNewlines(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}
/** Tối đa số câu hiện trong danh sách chọn tay cho mỗi dạng bài. */
export const PICKER_LIMIT_PER_TYPE = 200;

export const ASSIGNMENT_KINDS: AssignmentKind[] = ["TU", "PRACTICE", "MOCK"];
export const ASSIGNMENT_STATUSES: AssignmentStatus[] = ["OPEN", "CLOSED", "ARCHIVED"];

export const KIND_META: Record<AssignmentKind, { label: string; tone: "bad" | "plum" | "mute" }> = {
  TU: { label: "Luyện đề Tủ", tone: "bad" },
  PRACTICE: { label: "Luyện đề", tone: "mute" },
  MOCK: { label: "Mock test", tone: "plum" },
};

export const STATUS_META: Record<AssignmentStatus, { label: string; tone: "ok" | "mute" | "warn" }> = {
  OPEN: { label: "Đang mở", tone: "ok" },
  CLOSED: { label: "Đã đóng", tone: "mute" },
  ARCHIVED: { label: "Lưu trữ", tone: "mute" },
};

/** Thứ tự hiển thị trong bảng: đang mở trước, rồi đã đóng, cuối cùng lưu trữ. */
export const STATUS_ORDER: Record<AssignmentStatus, number> = { OPEN: 0, CLOSED: 1, ARCHIVED: 2 };

/** Tab lọc trên trang Giao bài tập (?status=). "Tất cả" = đang mở + đã đóng;
 * bài lưu trữ chỉ hiện ở tab Lưu trữ. */
export const ASSIGNMENT_FILTERS = [
  { key: "open", label: "Đang mở", panelTitle: "Bài tập đang mở", statuses: ["OPEN"] },
  { key: "closed", label: "Đã đóng", panelTitle: "Bài tập đã đóng", statuses: ["CLOSED"] },
  { key: "archived", label: "Lưu trữ", panelTitle: "Bài tập lưu trữ", statuses: ["ARCHIVED"] },
  { key: "all", label: "Tất cả", panelTitle: "Tất cả bài tập", statuses: ["OPEN", "CLOSED"] },
] as const satisfies readonly { key: string; label: string; panelTitle: string; statuses: readonly AssignmentStatus[] }[];

export type AssignmentFilterKey = (typeof ASSIGNMENT_FILTERS)[number]["key"];

export function parseAssignmentFilter(value: string | undefined): AssignmentFilterKey {
  return ASSIGNMENT_FILTERS.find((f) => f.key === value)?.key ?? "open";
}

const TYPE_BY_ID = new Map(QUESTION_TYPES.map((t) => [t.id, t]));
/** Vị trí dạng bài theo thứ tự đề thi (Speaking → Writing → Reading → Listening). */
const TYPE_ORDER = new Map(QUESTION_TYPES.map((t, i) => [t.id, i]));

export function typeCodeOf(questionTypeId: string): string {
  return TYPE_BY_ID.get(questionTypeId)?.code ?? questionTypeId;
}

export function typeNameOf(questionTypeId: string): string {
  return TYPE_BY_ID.get(questionTypeId)?.name ?? questionTypeId;
}

export function compareTypeOrder(a: string, b: string): number {
  return (TYPE_ORDER.get(a) ?? 999) - (TYPE_ORDER.get(b) ?? 999);
}

const DAY_MS = 24 * 60 * 60 * 1000;
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Ngày "YYYY-MM-DD" theo giờ Việt Nam (UTC+7, không có giờ mùa hè). */
export function toVnIsoDate(date: Date): string {
  return new Date(date.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
}

export function todayVnIsoDate(): string {
  return toVnIsoDate(new Date());
}

export function addDaysToIsoDate(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Ngày cuối cùng được chọn làm hạn nộp ("YYYY-MM-DD", giờ Việt Nam). */
export function maxDueVnIsoDate(): string {
  return addDaysToIsoDate(todayVnIsoDate(), DUE_MAX_DAYS);
}

/** "YYYY-MM-DD" → 23:59:59 ngày đó giờ Việt Nam. null nếu sai định dạng hoặc
 * không phải ngày có thật (vd. 2026-02-30). */
export function endOfVnDay(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const date = new Date(`${iso}T23:59:59+07:00`);
  if (Number.isNaN(date.getTime()) || toVnIsoDate(date) !== iso) return null;
  return date;
}

/** Tỷ lệ % an toàn (tổng 0 → 0). */
export function percent(part: number, total: number): number {
  return total > 0 ? (100 * part) / total : 0;
}
