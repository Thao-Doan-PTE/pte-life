import { prisma } from "@/lib/prisma";

const WFD_TYPE_ID = "write-from-dictation";

export async function getWfdQuestions() {
  return prisma.question.findMany({
    where: { questionTypeId: WFD_TYPE_ID },
    orderBy: { code: "asc" },
  });
}

/** Trả về Set các questionId mà user đã từng nộp bài (Đã luyện). */
export async function getWfdPracticedSet(userId: string): Promise<Set<string>> {
  const attempts = await prisma.practiceAttempt.findMany({
    where: { userId, questionTypeId: WFD_TYPE_ID },
    select: { questionId: true },
    distinct: ["questionId"],
  });
  return new Set(attempts.map((a) => a.questionId));
}

/** Trả về Set các questionId mà user đã đánh dấu "Ưa thích" ở WFD. */
export async function getWfdFavoriteSet(userId: string): Promise<Set<string>> {
  const favorites = await prisma.favorite.findMany({
    where: { userId, questionTypeId: WFD_TYPE_ID },
    select: { questionId: true },
  });
  return new Set(favorites.map((f) => f.questionId));
}

export async function getStreakDays(userId: string): Promise<number> {
  const attempts = await prisma.practiceAttempt.findMany({
    where: { userId },
    select: { createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  if (attempts.length === 0) return 0;

  const dayKeys = new Set(
    attempts.map((a) => {
      const d = a.createdAt;
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  while (true) {
    const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
    if (!dayKeys.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}
