"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Bật/tắt đánh dấu "Ưa thích" cho 1 câu hỏi — trả về trạng thái mới sau khi đổi. */
export async function toggleFavoriteAction(questionId: string): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Bạn cần đăng nhập để dùng tính năng này.");
  }
  const userId = session.user.id;

  const existing = await prisma.favorite.findUnique({
    where: { userId_questionId: { userId, questionId } },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return false;
  }

  const question = await prisma.question.findUniqueOrThrow({
    where: { id: questionId },
    select: { questionTypeId: true },
  });

  await prisma.favorite.create({
    data: { userId, questionId, questionTypeId: question.questionTypeId },
  });
  return true;
}
