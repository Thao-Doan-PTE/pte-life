"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSpeakingGrader } from "@/lib/scoring/ai/speaking-index";
import type { SpeakingGradeResult, SpeakingTaskType } from "@/lib/scoring/ai/speaking-index";
import { toPteScore } from "@/lib/scoring/types";
import type { Prisma } from "@/lib/generated/prisma/client";

export interface SpeakingSubmitResult {
  scorePct: number;
  pteScore: number;
  correct: boolean;
  grade: SpeakingGradeResult;
  wordsPerMinute: number;
  fillerWordCount: number;
}

function getReferenceText(content: Record<string, unknown>): string | undefined {
  return (
    (content.passage as string) ??
    (content.referenceText as string) ??
    (content.transcript as string) ??
    (content.referenceAnswer as string) ??
    (content.situationText as string) ??
    undefined
  );
}

const FILLER_WORDS = /\b(um+|uh+|erm+|like|you know|ừm+|ờ+)\b/gi;

export async function submitSpeakingAttemptAction(
  questionId: string,
  transcript: string,
  durationSeconds: number,
  pauseCount?: number,
  longestPauseMs?: number
): Promise<SpeakingSubmitResult> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Bạn cần đăng nhập để nộp bài.");
  }

  const question = await prisma.question.findUniqueOrThrow({
    where: { id: questionId },
  });
  const content = question.content as Record<string, unknown>;

  const wordCount = transcript.trim().length === 0 ? 0 : transcript.trim().split(/\s+/).length;
  const wordsPerMinute =
    durationSeconds > 0 ? Math.round((wordCount / durationSeconds) * 60) : 0;
  const fillerWordCount = (transcript.match(FILLER_WORDS) ?? []).length;

  const grader = getSpeakingGrader();
  const grade = await grader.grade({
    taskType: question.questionTypeId as SpeakingTaskType,
    transcript,
    durationSeconds,
    wordsPerMinute,
    fillerWordCount,
    pauseCount,
    longestPauseMs,
    referenceText: getReferenceText(content),
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
      response: {
        transcript,
        durationSeconds,
        wordsPerMinute,
        fillerWordCount,
        pauseCount,
        longestPauseMs,
        grade,
      } as unknown as Prisma.InputJsonValue,
      durationSec: Math.max(0, Math.round(durationSeconds)),
    },
  });

  return { scorePct, pteScore, correct, grade, wordsPerMinute, fillerWordCount };
}
