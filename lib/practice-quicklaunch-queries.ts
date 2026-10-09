import { prisma } from "@/lib/prisma";
import { QUESTION_TYPES } from "@/lib/question-types";

export interface LastPracticedType {
  typeId: string;
  skill: string;
  name: string;
  code: string;
  practicedCount: number;
  totalCount: number;
}

/** Dạng bài user luyện gần đây nhất (theo PracticeAttempt mới nhất), kèm số câu
 * đã luyện / tổng số câu của dạng đó — dùng cho thẻ "Học tiếp bài dở dang". */
export async function getLastPracticedType(userId: string): Promise<LastPracticedType | null> {
  const lastAttempt = await prisma.practiceAttempt.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { questionTypeId: true },
  });
  if (!lastAttempt) return null;

  const type = QUESTION_TYPES.find((t) => t.id === lastAttempt.questionTypeId);
  if (!type) return null;

  const [totalCount, practicedRows] = await Promise.all([
    prisma.question.count({ where: { questionTypeId: type.id } }),
    prisma.practiceAttempt.findMany({
      where: { userId, questionTypeId: type.id },
      select: { questionId: true },
      distinct: ["questionId"],
    }),
  ]);

  return {
    typeId: type.id,
    skill: type.skill,
    name: type.name,
    code: type.code,
    practicedCount: practicedRows.length,
    totalCount,
  };
}
