"use server";

import { auth } from "@/auth";
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
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Bạn cần đăng nhập để nộp bài.");
  }

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
      userId: session.user.id,
      questionId: question.id,
      questionTypeId: question.questionTypeId,
      scorePct,
      pteScore,
      isCorrect: correct,
      response: { text: studentText, grade } as unknown as Prisma.InputJsonValue,
      durationSec: Math.max(0, Math.round(durationSec)),
    },
  });

  return { scorePct, pteScore, correct, grade };
}
