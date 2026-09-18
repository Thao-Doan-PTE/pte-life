import { prisma } from "@/lib/prisma";
import { QUESTION_TYPES, getQuestionTypesBySkill, type Skill } from "@/lib/question-types";
import type { RecentAttempt, SkillProgress, DashboardOverview } from "@/lib/mock-dashboard";

const SKILLS: Skill[] = ["speaking", "writing", "reading", "listening"];

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

const WEEKDAY_LABELS_VI = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"]; // index = Date#getDay()

/** true nếu học viên đã từng vào Dashboard trước đây; sau khi gọi, đánh dấu đã thấy
 * để lần vào tiếp theo trả về true (chỉ hiện lời chào "Xin chào" lần đầu tiên). */
export async function checkAndMarkWelcomeSeen(userId: string): Promise<boolean> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { hasSeenWelcome: true },
  });
  if (!user.hasSeenWelcome) {
    await prisma.user.update({ where: { id: userId }, data: { hasSeenWelcome: true } });
  }
  return user.hasSeenWelcome;
}

/** Lấy ảnh đại diện mới nhất trực tiếp từ DB (không dùng session/JWT) để cập nhật
 * ngay sau khi học viên đổi ảnh, không cần đăng nhập lại. */
export async function getUserAvatarUrl(userId: string): Promise<string | null> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { avatarUrl: true },
  });
  return user.avatarUrl;
}

export async function getRecentAttempts(userId: string, limit = 5): Promise<RecentAttempt[]> {
  const attempts = await prisma.practiceAttempt.findMany({
    where: { userId },
    include: { question: { select: { skill: true, code: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return attempts.map((a) => ({
    id: a.id,
    skill: a.question.skill,
    questionTypeId: a.questionTypeId,
    questionCode: a.question.code,
    scorePct: a.scorePct,
    attemptedAt: a.createdAt.toISOString(),
  }));
}

export async function getQuestionCountsByType(typeIds: string[]): Promise<Record<string, number>> {
  const counts = await prisma.question.groupBy({
    by: ["questionTypeId"],
    where: { questionTypeId: { in: typeIds } },
    _count: { questionTypeId: true },
  });
  const map: Record<string, number> = {};
  for (const id of typeIds) map[id] = 0;
  for (const c of counts) map[c.questionTypeId] = c._count.questionTypeId;
  return map;
}

export async function getSkillProgress(userId: string): Promise<SkillProgress[]> {
  const [totalBySkill, practicedQuestions, attemptsByType] = await Promise.all([
    prisma.question.groupBy({ by: ["skill"], _count: { skill: true } }),
    prisma.practiceAttempt.findMany({
      where: { userId },
      select: { questionId: true, question: { select: { skill: true } } },
      distinct: ["questionId"],
    }),
    prisma.practiceAttempt.groupBy({
      by: ["questionTypeId"],
      where: { userId },
      _count: { questionTypeId: true },
    }),
  ]);

  const totalMap = new Map(totalBySkill.map((t) => [t.skill, t._count.skill]));

  const practicedMap = new Map<Skill, number>();
  for (const p of practicedQuestions) {
    const skill = p.question.skill;
    practicedMap.set(skill, (practicedMap.get(skill) ?? 0) + 1);
  }

  const typeCountMap = new Map(attemptsByType.map((a) => [a.questionTypeId, a._count.questionTypeId]));
  const typeById = new Map(QUESTION_TYPES.map((t) => [t.id, t]));

  const topTypeBySkill = new Map<Skill, { id: string; name: string; count: number }>();
  for (const [typeId, count] of typeCountMap) {
    const type = typeById.get(typeId);
    if (!type) continue;
    const current = topTypeBySkill.get(type.skill);
    if (!current || count > current.count) {
      topTypeBySkill.set(type.skill, { id: type.id, name: type.name, count });
    }
  }

  return SKILLS.map((skill) => {
    const totalQuestions = totalMap.get(skill) ?? 0;
    const practicedCount = practicedMap.get(skill) ?? 0;
    const progressPct = totalQuestions > 0 ? Math.round((practicedCount / totalQuestions) * 100) : 0;
    const top = topTypeBySkill.get(skill);
    const fallbackType = getQuestionTypesBySkill(skill)[0] ?? null;

    return {
      skill,
      totalQuestions,
      practicedQuestions: practicedCount,
      progressPct,
      topType: top
        ? { id: top.id, name: top.name }
        : fallbackType
          ? { id: fallbackType.id, name: fallbackType.name }
          : null,
    };
  });
}

export async function getDashboardOverview(userId: string): Promise<DashboardOverview> {
  const attempts = await prisma.practiceAttempt.findMany({
    where: { userId },
    select: { createdAt: true, scorePct: true, pteScore: true, isCorrect: true, durationSec: true },
    orderBy: { createdAt: "asc" },
  });

  const totalQuestions = attempts.length;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const msPerDay = 24 * 60 * 60 * 1000;
  const daysAgo = (d: Date) => Math.floor((startOfToday.getTime() - dayFloor(d).getTime()) / msPerDay);
  function dayFloor(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  // Streak (liên tiếp hiện tại) + kỷ lục (chuỗi dài nhất từng đạt được)
  const dayKeySet = new Set(attempts.map((a) => dayKey(a.createdAt)));
  let currentStreak = 0;
  {
    const cursor = new Date(startOfToday);
    while (dayKeySet.has(dayKey(cursor))) {
      currentStreak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  let bestStreak = 0;
  {
    const distinctDays = Array.from(
      new Set(attempts.map((a) => dayFloor(a.createdAt).getTime()))
    ).sort((a, b) => a - b);
    let run = 0;
    let prev: number | null = null;
    for (const t of distinctDays) {
      if (prev !== null && t - prev === msPerDay) {
        run += 1;
      } else {
        run = 1;
      }
      bestStreak = Math.max(bestStreak, run);
      prev = t;
    }
  }

  const todayCount = attempts.filter((a) => daysAgo(a.createdAt) === 0).length;
  const yesterdayCount = attempts.filter((a) => daysAgo(a.createdAt) === 1).length;

  const correctCount = attempts.filter((a) => a.isCorrect).length;
  const overallAccuracyPct = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  const last7 = attempts.filter((a) => daysAgo(a.createdAt) <= 6);
  const prior7 = attempts.filter((a) => daysAgo(a.createdAt) >= 7 && daysAgo(a.createdAt) <= 13);
  const accuracyOf = (list: typeof attempts) =>
    list.length > 0 ? (list.filter((a) => a.isCorrect).length / list.length) * 100 : null;
  const acc7 = accuracyOf(last7);
  const accPrior7 = accuracyOf(prior7);
  const accuracyDeltaPct = acc7 !== null && accPrior7 !== null ? Math.round(acc7 - accPrior7) : 0;

  const studyTimeTotalSec = attempts.reduce((sum, a) => sum + a.durationSec, 0);
  const studyTimeTotalMin = Math.round(studyTimeTotalSec / 60);
  const activeDayCount = dayKeySet.size;
  const studyTimeAvgPerDayMin = activeDayCount > 0 ? Math.round(studyTimeTotalMin / activeDayCount) : 0;

  const last14 = attempts.filter((a) => daysAgo(a.createdAt) <= 13);
  const prior14 = attempts.filter((a) => daysAgo(a.createdAt) >= 14 && daysAgo(a.createdAt) <= 27);
  const avgScoreOf = (list: typeof attempts) =>
    list.length > 0 ? list.reduce((sum, a) => sum + a.pteScore, 0) / list.length : null;
  const score14 = avgScoreOf(last14);
  const scorePrior14 = avgScoreOf(prior14);
  const scoreDelta2Weeks = score14 !== null && scorePrior14 !== null ? Math.round(score14 - scorePrior14) : 0;

  const weeklyTrend: { dayLabel: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(startOfToday);
    d.setDate(d.getDate() - i);
    const count = attempts.filter((a) => dayKey(a.createdAt) === dayKey(d)).length;
    weeklyTrend.push({ dayLabel: WEEKDAY_LABELS_VI[d.getDay()], count });
  }
  const weeklyAvgPerDay =
    Math.round((weeklyTrend.reduce((sum, d) => sum + d.count, 0) / 7) * 10) / 10;

  return {
    totalQuestions,
    overallAccuracyPct,
    accuracyDeltaPct,
    currentStreak,
    bestStreak,
    studyTimeTotalMin,
    studyTimeAvgPerDayMin,
    todayCount,
    todayDeltaVsYesterday: todayCount - yesterdayCount,
    scoreDelta2Weeks,
    weeklyTrend,
    weeklyAvgPerDay,
  };
}
