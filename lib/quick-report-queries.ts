import { prisma } from "@/lib/prisma";

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export interface QuickReportStats {
  avgScore: number | null;
  daysPracticed: number;
  streak: number;
}

/** Điểm trung bình (GSE, thang 90), tổng số ngày có luyện (không chỉ chuỗi liên
 * tiếp) và chuỗi ngày liên tiếp hiện tại — dùng cho khối "Báo cáo nhanh". */
export async function getQuickReportStats(userId: string): Promise<QuickReportStats> {
  const attempts = await prisma.practiceAttempt.findMany({
    where: { userId },
    select: { createdAt: true, pteScore: true },
  });

  const avgScore =
    attempts.length > 0 ? Math.round(attempts.reduce((sum, a) => sum + a.pteScore, 0) / attempts.length) : null;

  const dayKeySet = new Set(attempts.map((a) => dayKey(a.createdAt)));
  const daysPracticed = dayKeySet.size;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let streak = 0;
  const cursor = new Date(startOfToday);
  while (dayKeySet.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { avgScore, daysPracticed, streak };
}
