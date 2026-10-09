import { prisma } from "@/lib/prisma";
import { WEEKDAY_LABELS_VI, startOfWeekMonday } from "@/lib/week-utils";

/** Mục tiêu mặc định của hệ thống: 5 buổi luyện/tuần — chưa có cấu hình riêng
 * theo từng học viên/lớp nên tạm dùng 1 hằng số chung cho mọi người. */
export const WEEKLY_GOAL_SESSIONS = 5;

export interface WeeklyActivityDay {
  label: string;
  minutes: number;
  isToday: boolean;
}

export interface WeeklyActivityStats {
  days: WeeklyActivityDay[];
  totalMinutes: number;
  daysActive: number;
}

/** Số phút luyện tập theo từng ngày trong tuần hiện tại (Thứ Hai → Chủ nhật),
 * cộng dồn từ PracticeAttempt.durationSec — dùng cho biểu đồ "Hoạt động luyện tập". */
export async function getWeeklyActivityStats(userId: string): Promise<WeeklyActivityStats> {
  const monday = startOfWeekMonday(new Date());
  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);

  const attempts = await prisma.practiceAttempt.findMany({
    where: { userId, createdAt: { gte: monday, lt: nextMonday } },
    select: { createdAt: true, durationSec: true },
  });

  const minutesByOffset = new Array(7).fill(0) as number[];
  for (const a of attempts) {
    const offset = Math.floor((a.createdAt.getTime() - monday.getTime()) / 86_400_000);
    if (offset >= 0 && offset < 7) minutesByOffset[offset] += a.durationSec / 60;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: WeeklyActivityDay[] = minutesByOffset.map((min, offset) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + offset);
    return {
      label: WEEKDAY_LABELS_VI[date.getDay()],
      minutes: Math.round(min),
      isToday: date.getTime() === today.getTime(),
    };
  });

  const totalMinutes = days.reduce((sum, d) => sum + d.minutes, 0);
  const daysActive = days.filter((d) => d.minutes > 0).length;

  return { days, totalMinutes, daysActive };
}
