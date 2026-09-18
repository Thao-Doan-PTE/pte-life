import { prisma } from "@/lib/prisma";
import { QUESTION_TYPES, type Skill } from "@/lib/question-types";
import { questionExcerpt } from "@/lib/question-excerpt";

export { questionExcerpt };

export async function getPracticeHistory(
  userId: string,
  skill?: Skill,
  limit = 50
) {
  const attempts = await prisma.practiceAttempt.findMany({
    where: { userId, ...(skill ? { question: { skill } } : {}) },
    include: { question: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return attempts.map((a) => {
    const type = QUESTION_TYPES.find((t) => t.id === a.questionTypeId);
    return {
      id: a.id,
      skill: a.question.skill,
      questionTypeId: a.questionTypeId,
      typeName: type?.name ?? a.questionTypeId,
      questionCode: a.question.code,
      excerpt: questionExcerpt(a.question.content as Record<string, unknown>),
      scorePct: a.scorePct,
      pteScore: a.pteScore,
      createdAt: a.createdAt,
    };
  });
}

export async function getAttemptDetail(userId: string, attemptId: string) {
  const attempt = await prisma.practiceAttempt.findFirst({
    where: { id: attemptId, userId },
    include: { question: true },
  });
  return attempt;
}
