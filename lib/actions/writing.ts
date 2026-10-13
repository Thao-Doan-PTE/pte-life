"use server";

import { revalidatePath } from "next/cache";
import { clampText, requirePracticeAccess } from "@/lib/practice-access";
import { consumeRateLimits } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { createAttemptWithAssignmentLink, getMockSessionAssignmentId } from "@/lib/admin/assignment-link";
import { getWritingGrader } from "@/lib/scoring/ai";
import { CRITERIA_BY_TASK } from "@/lib/scoring/ai/rubric";
import { checkWritingForm } from "@/lib/scoring/writing-form";
import { applyWritingRules, emptyWritingGrade } from "@/lib/scoring/writing-rules";
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

/** `mockSessionId` (tuỳ chọn): lượt Mock test đang làm — chỉ dùng để ưu tiên gắn
 * bài vào bài tập của lượt đó, server tự kiểm tra lượt thi thuộc học viên. */
export async function submitWritingAttemptAction(
  questionId: string,
  studentText: string,
  durationSec = 0,
  mockSessionId?: string
): Promise<WritingSubmitResult> {
  const user = await requirePracticeAccess();
  // Bài viết dài nhất (Write Essay) tối đa 380 từ — giới hạn ký tự để không gửi
  // văn bản khổng lồ cho AI chấm.
  studentText = clampText(studentText, 5000);

  const question = await prisma.question.findUniqueOrThrow({
    where: { id: questionId },
  });
  if (!(question.questionTypeId in CRITERIA_BY_TASK)) {
    throw new Error("Câu hỏi này không phải dạng Writing.");
  }
  const taskType = question.questionTypeId as WritingTaskType;
  const content = question.content as Record<string, unknown>;

  // Hình thức (số từ, số câu) chấm bằng code; bài quá ngắn thì không gọi AI.
  const formCheck = checkWritingForm(taskType, studentText);
  let grade;
  if (formCheck.wordCount < 5) {
    grade = emptyWritingGrade(taskType, formCheck);
  } else {
    if (!(await consumeRateLimits(["aiGradeUser", user.id], ["aiGradeUserDay", user.id]))) {
      throw new Error("Bạn đã chấm quá nhiều bài, vui lòng thử lại sau.");
    }
    const raw = await getWritingGrader().grade({
      taskType,
      sourceText: getSourceText(content),
      studentText,
      wordCount: formCheck.wordCount,
      sentenceCount: formCheck.sentenceCount,
    });
    grade = applyWritingRules(taskType, raw, formCheck);
  }

  const criteriaScores = Object.values(grade.criteria).map((c) => c.scorePct);
  const scorePct = Math.round(
    criteriaScores.reduce((sum, s) => sum + s, 0) / criteriaScores.length
  );
  const pteScore = toPteScore(scorePct);
  const correct = scorePct >= 80;

  // Chấm AI xong mới mở transaction gắn bài tập + lưu bài (không giữ khoá khi chờ AI).
  const preferredAssignmentId = mockSessionId
    ? await getMockSessionAssignmentId(user.id, mockSessionId, question.id)
    : null;
  const link = await createAttemptWithAssignmentLink(
    { userId: user.id, questionId: question.id, questionTypeId: question.questionTypeId, preferredAssignmentId },
    {
      scorePct,
      pteScore,
      isCorrect: correct,
      response: { text: studentText, grade } as unknown as Prisma.InputJsonValue,
      durationSec: Math.min(24 * 3600, Math.max(0, Math.round(Number(durationSec) || 0))),
    }
  );

  if (link.assignmentId) revalidatePath("/bai-tap");

  return { scorePct, pteScore, correct, grade };
}
