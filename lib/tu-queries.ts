import { prisma } from "@/lib/prisma";
import { QUESTION_TYPES, type Skill, type FrequencyTier } from "@/lib/question-types";

/** 2 dạng mà bộ đề Tủ tập trung — xem prisma/schema.prisma (QuestionBank). */
export const TU_TYPE_IDS = ["write-from-dictation", "repeat-sentence"] as const;

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export interface TuTypeProgress {
  typeId: string;
  typeName: string;
  typeCode: string;
  skill: Skill;
  frequencyTier?: FrequencyTier;
  practicedCount: number;
  totalCount: number;
  avgPteScore: number | null;
}

export interface TuRecentAttempt {
  id: string;
  typeId: string;
  typeCode: string;
  questionCode: string;
  scorePct: number;
  attemptedAt: string;
}

export interface TuOverview {
  progress: TuTypeProgress[];
  recent: TuRecentAttempt[];
  totalQuestions: number;
}

/** Tóm tắt riêng cho ngân hàng Tủ (bank: "TU") — không gộp chung với tiến độ
 * ngân hàng PTE thường, dù cùng 2 dạng WFD/RS. */
export async function getTuOverview(userId: string): Promise<TuOverview> {
  const questions = await prisma.question.findMany({
    where: { questionTypeId: { in: [...TU_TYPE_IDS] }, bank: "TU", archivedAt: null },
    select: { id: true, questionTypeId: true },
  });
  const questionIds = questions.map((q) => q.id);

  const attempts = questionIds.length
    ? await prisma.practiceAttempt.findMany({
        where: { userId, questionId: { in: questionIds } },
        include: { question: { select: { code: true } } },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const practicedIdsByType = new Map<string, Set<string>>();
  const totalByType = new Map<string, number>();
  for (const q of questions) {
    totalByType.set(q.questionTypeId, (totalByType.get(q.questionTypeId) ?? 0) + 1);
    if (!practicedIdsByType.has(q.questionTypeId)) practicedIdsByType.set(q.questionTypeId, new Set());
  }

  const scoreSumByType = new Map<string, number>();
  const scoreCountByType = new Map<string, number>();

  const seenQuestion = new Set<string>();
  const recent: TuRecentAttempt[] = [];
  for (const a of attempts) {
    if (!seenQuestion.has(a.questionId)) {
      seenQuestion.add(a.questionId);
      practicedIdsByType.get(a.questionTypeId)?.add(a.questionId);
    }
    scoreSumByType.set(a.questionTypeId, (scoreSumByType.get(a.questionTypeId) ?? 0) + a.pteScore);
    scoreCountByType.set(a.questionTypeId, (scoreCountByType.get(a.questionTypeId) ?? 0) + 1);
    if (recent.length < 5) {
      const type = QUESTION_TYPES.find((t) => t.id === a.questionTypeId);
      recent.push({
        id: a.id,
        typeId: a.questionTypeId,
        typeCode: type?.code ?? a.questionTypeId,
        questionCode: a.question.code,
        scorePct: a.scorePct,
        attemptedAt: a.createdAt.toISOString(),
      });
    }
  }

  const progress: TuTypeProgress[] = TU_TYPE_IDS.map((typeId) => {
    const type = QUESTION_TYPES.find((t) => t.id === typeId)!;
    const scoreCount = scoreCountByType.get(typeId) ?? 0;
    return {
      typeId,
      typeName: type.name,
      typeCode: type.code,
      skill: type.skill,
      frequencyTier: type.frequencyTier,
      practicedCount: practicedIdsByType.get(typeId)?.size ?? 0,
      totalCount: totalByType.get(typeId) ?? 0,
      avgPteScore: scoreCount > 0 ? Math.round((scoreSumByType.get(typeId) ?? 0) / scoreCount) : null,
    };
  });

  return { progress, recent, totalQuestions: questionIds.length };
}

export interface TuQuickReportStats {
  avgScore: number | null;
  daysPracticed: number;
  streak: number;
}

/** Điểm trung bình, tổng số ngày có luyện và chuỗi ngày liên tiếp — chỉ tính
 * trên các lượt làm câu hỏi thuộc ngân hàng Tủ (bank: "TU"), tách riêng khỏi
 * báo cáo của Luyện đề PTE dù cùng 2 dạng WFD/RS. */
export async function getTuQuickReportStats(userId: string): Promise<TuQuickReportStats> {
  const attempts = await prisma.practiceAttempt.findMany({
    where: { userId, questionTypeId: { in: [...TU_TYPE_IDS] }, question: { bank: "TU" } },
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
