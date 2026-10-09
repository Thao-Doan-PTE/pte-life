/** Nhãn thứ trong tuần theo tiếng Việt, index khớp với Date#getDay() (0 = Chủ nhật). */
export const WEEKDAY_LABELS_VI = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

/** Thứ Hai (00:00) của tuần chứa ngày `d`, dùng làm mốc chung cho biểu đồ hoạt
 * động tuần và lịch học tuần — tránh mỗi chỗ tự tính lệch nhau. */
export function startOfWeekMonday(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diffToMonday);
  return date;
}

export interface WeekDateCell {
  dayOfMonth: number;
  weekdayLabel: string;
  isToday: boolean;
}

/** 7 ngày Thứ Hai → Chủ nhật của tuần hiện tại, dùng cho dải lịch mini. */
export function getCurrentWeekDates(now: Date = new Date()): WeekDateCell[] {
  const monday = startOfWeekMonday(now);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + offset);
    return {
      dayOfMonth: date.getDate(),
      weekdayLabel: WEEKDAY_LABELS_VI[date.getDay()],
      isToday: date.getTime() === today.getTime(),
    };
  });
}
