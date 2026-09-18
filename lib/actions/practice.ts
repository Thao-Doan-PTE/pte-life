"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { scoreAttempt } from "@/lib/scoring/rule-based";
import type { ScoreResult } from "@/lib/scoring/types";
import type { Prisma } from "@/lib/generated/prisma/client";

/** Điểm PTE của lần làm gần nhất trước đó cho đúng câu này (null nếu chưa từng làm). */
export async function getPreviousAttemptScore(questionId: string): Promise<number | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const last = await prisma.practiceAttempt.findFirst({
    where: { userId: session.user.id, questionId },
    orderBy: { createdAt: "desc" },
    select: { pteScore: true },
  });

  return last?.pteScore ?? null;
}

export async function submitAttemptAction(
  questionId: string,
  response: unknown,
  durationSec = 0
): Promise<ScoreResult> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Bạn cần đăng nhập để nộp bài.");
  }

  const question = await prisma.question.findUniqueOrThrow({
    where: { id: questionId },
  });

  const result = scoreAttempt(
    question.questionTypeId,
    question.content as Record<string, unknown>,
    response
  );

  await prisma.practiceAttempt.create({
    data: {
      userId: session.user.id,
      questionId: question.id,
      questionTypeId: question.questionTypeId,
      scorePct: result.scorePct,
      pteScore: result.pteScore,
      isCorrect: result.correct,
      response: response as Prisma.InputJsonValue,
      durationSec: Math.max(0, Math.round(durationSec)),
    },
  });

  return result;
}
