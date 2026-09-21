import { prisma } from "@/lib/prisma";

export function getQuestionsForType(questionTypeId: string) {
  return prisma.question.findMany({
    where: { questionTypeId },
    orderBy: { code: "asc" },
  });
}

export async function getQuestionWithSiblings(
  questionTypeId: string,
  questionId: string
) {
  const all = await getQuestionsForType(questionTypeId);
  const index = all.findIndex((q) => q.id === questionId);
  return { question: index >= 0 ? all[index] : null, all, index };
}

/** Trả về Set các questionId mà user đã từng nộp bài cho đúng 1 dạng câu hỏi. */
export async function getPracticedSet(
  userId: string,
  questionTypeId: string
): Promise<Set<string>> {
  const attempts = await prisma.practiceAttempt.findMany({
    where: { userId, questionTypeId },
    select: { questionId: true },
    distinct: ["questionId"],
  });
  return new Set(attempts.map((a) => a.questionId));
}

/** Trả về Set các questionId mà user đã đánh dấu "Ưa thích" cho đúng 1 dạng câu hỏi. */
export async function getFavoriteSet(
  userId: string,
  questionTypeId: string
): Promise<Set<string>> {
  const favorites = await prisma.favorite.findMany({
    where: { userId, questionTypeId },
    select: { questionId: true },
  });
  return new Set(favorites.map((f) => f.questionId));
}

/** true nếu user đã đánh dấu "Ưa thích" đúng 1 câu hỏi cụ thể. */
export async function isFavorited(userId: string, questionId: string): Promise<boolean> {
  const favorite = await prisma.favorite.findUnique({
    where: { userId_questionId: { userId, questionId } },
  });
  return favorite !== null;
}
