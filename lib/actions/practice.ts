"use server";

import { auth } from "@/auth";
import { requirePracticeAccess } from "@/lib/practice-access";
import { toOpaqueParagraphId } from "@/lib/opaque-id";
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
  const user = await requirePracticeAccess();
  // Câu trả lời được lưu nguyên vào DB — chặn payload khổng lồ.
  if (JSON.stringify(response ?? null).length > 20_000) {
    throw new Error("Câu trả lời quá dài.");
  }

  const question = await prisma.question.findUniqueOrThrow({
    where: { id: questionId },
  });

  const content = question.content as Record<string, unknown>;

  // Reorder Paragraphs: trình duyệt chỉ biết mã ẩn của từng đoạn (xem
  // lib/opaque-id.ts) — đổi về mã gốc để chấm, rồi đổi đáp án về mã ẩn để
  // trình duyệt hiển thị phần chữa bài.
  let toOpaque: ((id: string) => string) | null = null;
  if (question.questionTypeId === "reorder-paragraphs" && Array.isArray(content.paragraphs)) {
    const ids = (content.paragraphs as { id: string }[]).map((p) => p.id);
    const fromOpaque = new Map(ids.map((id) => [toOpaqueParagraphId(question.id, id), id]));
    toOpaque = (id) => toOpaqueParagraphId(question.id, id);
    if (Array.isArray(response)) {
      response = response.map((token) => fromOpaque.get(String(token)) ?? String(token));
    }
  }

  const result = scoreAttempt(question.questionTypeId, content, response);
  if (toOpaque && Array.isArray(result.reveal.correctOrder)) {
    result.reveal = { ...result.reveal, correctOrder: (result.reveal.correctOrder as string[]).map(toOpaque) };
  }

  await prisma.practiceAttempt.create({
    data: {
      userId: user.id,
      questionId: question.id,
      questionTypeId: question.questionTypeId,
      scorePct: result.scorePct,
      pteScore: result.pteScore,
      isCorrect: result.correct,
      response: response as Prisma.InputJsonValue,
      durationSec: Math.min(24 * 3600, Math.max(0, Math.round(Number(durationSec) || 0))),
    },
  });

  return result;
}
