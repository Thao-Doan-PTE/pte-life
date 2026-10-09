import { prisma } from "@/lib/prisma";
import { QUESTION_TYPES, type Skill } from "@/lib/question-types";

export async function getMockTestStats(userId: string) {
  const sessions = await prisma.mockTestSession.findMany({
    where: { userId, status: "completed" },
  });
  const total = sessions.length;
  const scores = sessions
    .map((s) => s.scorePct)
    .filter((s): s is number => s !== null);
  const averageScorePct =
    scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
      : 0;
  return { totalCompleted: total, averageScorePct };
}

export async function getMockTestHistory(userId: string, limit = 20) {
  return prisma.mockTestSession.findMany({
    where: { userId },
    orderBy: { startedAt: "desc" },
    take: limit,
  });
}

export interface FullMockSummary {
  testsDone: number;
  lastScore: number | null;
  lastSessionId: string | null;
  weakestSkill: Skill | null;
  weakestScore: number | null;
}

/** Tóm tắt kết quả Full Mock Test gần nhất — dùng cho thẻ tóm tắt đầu trang
 * Mocktest. Chỉ tính trên các lượt mode "full" đã hoàn thành (có điểm GSE thật
 * từ lib/gse-scoring.ts, không suy ra từ scorePct %). */
export async function getFullMockSummary(userId: string): Promise<FullMockSummary> {
  const sessions = await prisma.mockTestSession.findMany({
    where: { userId, mode: "full", status: "completed" },
    orderBy: { completedAt: "desc" },
  });
  const latest = sessions[0];
  if (!latest || latest.overallScore === null) {
    return { testsDone: sessions.length, lastScore: null, lastSessionId: null, weakestSkill: null, weakestScore: null };
  }

  const skillScores: { skill: Skill; score: number | null }[] = [
    { skill: "listening", score: latest.listeningScore },
    { skill: "reading", score: latest.readingScore },
    { skill: "speaking", score: latest.speakingScore },
    { skill: "writing", score: latest.writingScore },
  ];
  const scored = skillScores.filter((s): s is { skill: Skill; score: number } => s.score !== null);
  const weakest = scored.length > 0 ? scored.reduce((a, b) => (b.score < a.score ? b : a)) : null;

  return {
    testsDone: sessions.length,
    lastScore: latest.overallScore,
    lastSessionId: latest.id,
    weakestSkill: weakest?.skill ?? null,
    weakestScore: weakest?.score ?? null,
  };
}

export interface WeakestQuestionType {
  typeId: string;
  typeName: string;
  skill: Skill;
  avgScorePct: number;
}

/** Dạng câu hỏi có điểm trung bình thấp nhất trong các lần làm gần đây nhất
 * của mỗi câu (không đếm trùng khi làm lại 1 câu nhiều lần) — dùng để gợi ý
 * "Dạng cần cải thiện" ở đầu trang Mocktest. */
export async function getWeakestQuestionType(userId: string): Promise<WeakestQuestionType | null> {
  const attempts = await prisma.practiceAttempt.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { questionId: true, questionTypeId: true, scorePct: true },
  });
  if (attempts.length === 0) return null;

  const latestByQuestion = new Map<string, { questionTypeId: string; scorePct: number }>();
  for (const a of attempts) {
    if (!latestByQuestion.has(a.questionId)) latestByQuestion.set(a.questionId, a);
  }

  const byType = new Map<string, { count: number; sum: number }>();
  for (const a of latestByQuestion.values()) {
    const cur = byType.get(a.questionTypeId) ?? { count: 0, sum: 0 };
    cur.count += 1;
    cur.sum += a.scorePct;
    byType.set(a.questionTypeId, cur);
  }

  let weakest: { typeId: string; avg: number } | null = null;
  for (const [typeId, { count, sum }] of byType) {
    const avg = sum / count;
    if (!weakest || avg < weakest.avg) weakest = { typeId, avg };
  }
  if (!weakest) return null;

  const type = QUESTION_TYPES.find((t) => t.id === weakest!.typeId);
  if (!type) return null;

  return {
    typeId: type.id,
    typeName: type.name,
    skill: type.skill,
    avgScorePct: Math.round(weakest.avg),
  };
}

export interface SessionQuestionResult {
  questionId: string;
  code: string;
  questionTypeId: string;
  typeName: string;
  scorePct: number | null;
}

export async function getSessionQuestionResults(
  userId: string,
  questionIds: string[],
  startedAt: Date
): Promise<SessionQuestionResult[]> {
  const [questions, attempts] = await Promise.all([
    prisma.question.findMany({ where: { id: { in: questionIds } } }),
    prisma.practiceAttempt.findMany({
      where: {
        userId,
        questionId: { in: questionIds },
        createdAt: { gte: startedAt },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const latestScoreByQuestion = new Map<string, number>();
  for (const a of attempts) {
    if (!latestScoreByQuestion.has(a.questionId)) {
      latestScoreByQuestion.set(a.questionId, a.scorePct);
    }
  }

  const byId = new Map(questions.map((q) => [q.id, q]));

  return questionIds.map((id) => {
    const q = byId.get(id);
    const type = QUESTION_TYPES.find((t) => t.id === q?.questionTypeId);
    return {
      questionId: id,
      code: q?.code ?? "?",
      questionTypeId: q?.questionTypeId ?? "",
      typeName: type?.name ?? q?.questionTypeId ?? "",
      scorePct: latestScoreByQuestion.get(id) ?? null,
    };
  });
}
