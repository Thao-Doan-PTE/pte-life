"use server";

import { clampText, requirePracticeAccess } from "@/lib/practice-access";
import { consumeRateLimits } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { getWritingGrader } from "@/lib/scoring/ai";
import type { WritingGradeResult, WritingTaskType } from "@/lib/scoring/ai";
import { toPteScore } from "@/lib/scoring/types";
import type { Prisma } from "@/lib/generated/prisma/client";

export interface WritingSubmitResult {
  scorePct: number;
  pteScore: number;
  correct: boolean;
  grade: WritingGradeResult;
}

function getSourceText(content: Record<string, unknown>): string {
  return (
    (content.passage as string) ??
    (content.prompt as string) ??
    (content.transcript as string) ??
    ""
  );
}

export async function submitWritingAttemptAction(
  questionId: string,
  studentText: string,
  durationSec = 0
): Promise<WritingSubmitResult> {
  const user = await requirePracticeAccess();
  if (!(await consumeRateLimits(["aiGradeUser", user.id], ["aiGradeUserDay", user.id]))) {
    throw new Error("Bạn đã chấm quá nhiều bài, vui lòng thử lại sau.");
  }
  // Bài viết dài nhất (Write Essay) tối đa 300 từ — giới hạn ký tự để không gửi
  // văn bản khổng lồ cho AI chấm.
  studentText = clampText(studentText, 5000);

  const question = await prisma.question.findUniqueOrThrow({
    where: { id: questionId },
  });
  const content = question.content as Record<string, unknown>;

  const grader = getWritingGrader();
  const grade = await grader.grade({
    taskType: question.questionTypeId as WritingTaskType,
    sourceText: getSourceText(content),
    studentText,
  });

  const criteriaScores = Object.values(grade.criteria).map((c) => c.scorePct);
  const scorePct = Math.round(
    criteriaScores.reduce((sum, s) => sum + s, 0) / criteriaScores.length
  );
  const pteScore = toPteScore(scorePct);
  const correct = scorePct >= 80;

  await prisma.practiceAttempt.create({
    data: {
      userId: user.id,
      questionId: question.id,
      questionTypeId: question.questionTypeId,
      scorePct,
      pteScore,
      isCorrect: correct,
      response: { text: studentText, grade } as unknown as Prisma.InputJsonValue,
      durationSec: Math.min(24 * 3600, Math.max(0, Math.round(Number(durationSec) || 0))),
    },
  });

  return { scorePct, pteScore, correct, grade };
}
