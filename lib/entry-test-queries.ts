import { prisma } from "@/lib/prisma";
import { ENTRY_TEST_SECTIONS, findEntryTestQuestion } from "@/lib/entry-test-data";
import { gradeEntryTestAttempt, type EntryTestGradeSummary } from "@/lib/entry-test-grading";

export interface EntryTestAttemptOverview {
  id: string;
  status: "IN_PROGRESS" | "SUBMITTED" | "GRADED";
  startedAt: string;
  submittedAt: string | null;
  autoSubmitted: boolean;
}

/** Lượt làm gần nhất của học viên (bất kỳ trạng thái nào), dùng để quyết định
 * hiển thị: còn đang dở (resume), đã nộp (xem kết quả), hay chưa làm lần nào. */
export async function getLatestEntryTestAttempt(userId: string): Promise<EntryTestAttemptOverview | null> {
  const attempt = await prisma.entryTestAttempt.findFirst({
    where: { userId },
    orderBy: { startedAt: "desc" },
  });
  if (!attempt) return null;
  return {
    id: attempt.id,
    status: attempt.status,
    startedAt: attempt.startedAt.toISOString(),
    submittedAt: attempt.submittedAt?.toISOString() ?? null,
    autoSubmitted: attempt.autoSubmitted,
  };
}

export interface EntryTestReviewRow {
  questionId: string;
  sectionName: string;
  responseText: string | null;
  audioUrl: string | null;
  answerDisplay: string | null;
  pointsAwarded: number | null;
  pointsMax: number;
  pending: boolean;
}

export interface EntryTestResultDetail {
  summary: EntryTestGradeSummary;
  rows: EntryTestReviewRow[];
  submittedAt: string | null;
  autoSubmitted: boolean;
  durationUsedSec: number;
}

/** Dựng lại kết quả đầy đủ của 1 lượt đã nộp, từ dữ liệu đã lưu trong DB —
 * dùng khi học viên tải lại trang sau khi nộp (không cần chấm lại trên client). */
export async function getEntryTestResultDetail(attemptId: string): Promise<EntryTestResultDetail | null> {
  const attempt = await prisma.entryTestAttempt.findUnique({
    where: { id: attemptId },
    include: { answers: true },
  });
  if (!attempt || !attempt.submittedAt) return null;

  const responses: Record<string, string> = {};
  const answerByQuestion = new Map(attempt.answers.map((a) => [a.questionId, a]));
  for (const a of attempt.answers) {
    if (a.responseText != null) responses[a.questionId] = a.responseText;
  }

  const summary = gradeEntryTestAttempt(ENTRY_TEST_SECTIONS, responses);

  const rows: EntryTestReviewRow[] = ENTRY_TEST_SECTIONS.flatMap((section) =>
    section.items.map((q) => {
      const saved = answerByQuestion.get(q.id);
      const answerDisplay =
        q.type === "read_aloud"
          ? null
          : "answer" in q
            ? Array.isArray(q.answer)
              ? (q.answer[0] ?? null)
              : (q.answer ?? null)
            : null;
      return {
        questionId: q.id,
        sectionName: section.name,
        responseText: saved?.responseText ?? null,
        audioUrl: saved?.audioUrl ?? null,
        answerDisplay,
        pointsAwarded: saved?.pointsAwarded ?? null,
        pointsMax: q.points,
        pending: saved?.pointsAwarded == null && q.type !== "mcq" ? answerDisplay == null : false,
      };
    })
  );

  const durationUsedSec = Math.round((attempt.submittedAt.getTime() - attempt.startedAt.getTime()) / 1000);

  return {
    summary,
    rows,
    submittedAt: attempt.submittedAt.toISOString(),
    autoSubmitted: attempt.autoSubmitted,
    durationUsedSec,
  };
}

export function getEntryTestQuestionLabel(id: string): string {
  return findEntryTestQuestion(id)?.id ?? id;
}
