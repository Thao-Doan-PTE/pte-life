import { prisma } from "@/lib/prisma";
import { getQuestionTypesForPackage, type ExamPackage, type Skill, type FrequencyTier } from "@/lib/question-types";

export interface TypeProgress {
  id: string;
  skill: Skill;
  code: string;
  name: string;
  descriptionVi: string;
  isNewType?: boolean;
  frequencyTier?: FrequencyTier;
  totalCount: number;
  practicedCount: number;
}

/** Tiến độ luyện tập theo từng dạng bài (không chỉ tổng theo kỹ năng) — dùng cho
 * trang "Tiến độ theo kỹ năng". Gộp 1 lần cho toàn bộ dạng bài trong gói thi của
 * user để tránh N+1 query khi hiển thị cả 22 dạng cùng lúc. */
export async function getTypeProgressForPackage(userId: string, examPackage: ExamPackage): Promise<TypeProgress[]> {
  const types = getQuestionTypesForPackage(examPackage);
  const typeIds = types.map((t) => t.id);

  const [totalCounts, practicedRows] = await Promise.all([
    prisma.question.groupBy({
      by: ["questionTypeId"],
      where: { questionTypeId: { in: typeIds }, archivedAt: null },
      _count: { questionTypeId: true },
    }),
    prisma.practiceAttempt.findMany({
      // Cùng bộ lọc archivedAt với tổng ở trên để tử số không vượt mẫu số
      // (câu đã luyện rồi bị lưu trữ không còn được tính).
      where: { userId, questionTypeId: { in: typeIds }, question: { archivedAt: null } },
      select: { questionTypeId: true, questionId: true },
      distinct: ["questionId"],
    }),
  ]);

  const totalMap = new Map(totalCounts.map((c) => [c.questionTypeId, c._count.questionTypeId]));
  const practicedMap = new Map<string, number>();
  for (const row of practicedRows) {
    practicedMap.set(row.questionTypeId, (practicedMap.get(row.questionTypeId) ?? 0) + 1);
  }

  return types.map((t) => {
    const totalCount = totalMap.get(t.id) ?? 0;
    return {
      id: t.id,
      skill: t.skill,
      code: t.code,
      name: t.name,
      descriptionVi: t.descriptionVi,
      isNewType: t.isNewType,
      frequencyTier: t.frequencyTier,
      totalCount,
      practicedCount: Math.min(practicedMap.get(t.id) ?? 0, totalCount),
    };
  });
}
