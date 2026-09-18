import { prisma } from "@/lib/prisma";
import { QUESTION_TYPES } from "@/lib/question-types";

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
