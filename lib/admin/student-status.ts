/** Trạng thái gói học của học viên (HANDOFF.md mục 5), ưu tiên từ trên xuống:
 * 1. Bảo lưu: reservedUntil là hôm nay hoặc sau đó (ngày lịch giờ VN) →
 *    "Bảo lưu đến dd/mm/yyyy". reservedUntil chỉ để hiện nhãn (quyết định 5B):
 *    lượt bảo lưu vẫn trừ reservationsLeft + cộng 30 ngày vào expiresAt như cũ,
 *    học viên vẫn vào học bình thường.
 * 2. Hết hạn: expiresAt đã qua.
 * 3. Còn ≤ 14 ngày: "Còn N ngày" (cảnh báo).
 * 4. Còn lại: "Đang học".
 * Hàm thuần — dùng được cả ở server lẫn client. */

export const EXPIRING_SOON_DAYS = 14;

/** Mỗi lượt bảo lưu cộng 30 ngày vào hạn; nhãn "Bảo lưu đến…" kéo thêm 30 ngày (cộng dồn nếu đang bảo lưu) nhưng không quá ngày hết hạn mới. */
export const RESERVATION_DAYS = 30;

export type StudentStatusKey = "reserved" | "active" | "soon" | "expired";

export interface StudentStatus {
  key: StudentStatusKey;
  label: string;
  /** Số ngày còn lại tới hạn gói học (âm nếu đã hết hạn) — kể cả khi đang bảo lưu. */
  daysLeft: number;
  pill: "adm-pill-ok" | "adm-pill-warn" | "adm-pill-bad" | "adm-pill-plum";
}

const DAY_MS = 24 * 60 * 60 * 1000;
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Số thứ tự ngày lịch giờ Việt Nam (UTC+7, không đổi giờ theo mùa). */
function vnDayIndex(d: Date): number {
  return Math.floor((d.getTime() + VN_OFFSET_MS) / DAY_MS);
}

/** Số ngày từ hôm nay tới ngày hết hạn, tính theo ngày lịch giờ Việt Nam. */
export function daysUntilExpiry(expiresAt: Date | string, now: Date = new Date()): number {
  return vnDayIndex(new Date(expiresAt)) - vnDayIndex(now);
}

/** 23:59:59.999 (giờ VN) của ngày lịch cách hôm nay offsetDays ngày. */
export function endOfVnDay(offsetDays: number, now: Date = new Date()): Date {
  return new Date((vnDayIndex(now) + offsetDays + 1) * DAY_MS - VN_OFFSET_MS - 1);
}

/** Đang bảo lưu: có reservedUntil và ngày đó (giờ VN) chưa qua. */
export function isReserved(reservedUntil: Date | string | null | undefined, now: Date = new Date()): boolean {
  return reservedUntil != null && daysUntilExpiry(reservedUntil, now) >= 0;
}

/** reservedUntil không bắt buộc để các nơi chỉ có expiresAt vẫn gọi được
 * (khi đó không bao giờ ra trạng thái "Bảo lưu"). */
export function getStudentStatus(
  expiresAt: Date | string,
  reservedUntil?: Date | string | null,
  now: Date = new Date()
): StudentStatus {
  const daysLeft = daysUntilExpiry(expiresAt, now);
  if (reservedUntil != null && isReserved(reservedUntil, now)) {
    return { key: "reserved", label: `Bảo lưu đến ${formatVnDate(reservedUntil)}`, daysLeft, pill: "adm-pill-plum" };
  }
  if (daysLeft < 0) return { key: "expired", label: "Hết hạn", daysLeft, pill: "adm-pill-bad" };
  if (daysLeft <= EXPIRING_SOON_DAYS) {
    return { key: "soon", label: `Còn ${daysLeft} ngày`, daysLeft, pill: "adm-pill-warn" };
  }
  return { key: "active", label: "Đang học", daysLeft, pill: "adm-pill-ok" };
}

/** dd/mm/yyyy theo giờ Việt Nam. */
export function formatVnDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

/** HH:MM dd/mm/yyyy theo giờ Việt Nam. */
export function formatVnDateTime(date: Date | string): string {
  const d = new Date(date);
  const time = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });
  return `${time} ${formatVnDate(d)}`;
}

export const PACKAGE_LABEL: Record<string, string> = {
  academic: "PTE Academic",
  core: "PTE Core",
};
