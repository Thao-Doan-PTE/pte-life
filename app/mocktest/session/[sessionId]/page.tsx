import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MockExamShell } from "@/components/mocktest/mock-exam-shell";
import { renderExamPlayer } from "@/components/mocktest/exam-player-switch";
import { submitMockAnswerAndAdvance } from "@/lib/actions/mocktest";
import { PRACTICE_INSTRUCTIONS } from "@/lib/practice-config";
import { QUESTION_TYPES } from "@/lib/question-types";
import { requireClassStudent } from "@/lib/require-class-student";
import { shouldCollectAssignmentAudio } from "@/lib/admin/assignment-link";

export default async function MockTestSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  // Chặn ở từng trang (không chỉ ở layout): khi chuyển trang phía trình duyệt,
  // Next.js có thể bỏ qua layout đã có sẵn.
  await requireClassStudent();
  const { sessionId } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const mockSession = await prisma.mockTestSession.findFirst({
    where: { id: sessionId, userId },
  });
  if (!mockSession) notFound();
  if (mockSession.status === "completed") {
    redirect(`/mocktest/session/${sessionId}/result`);
  }

  const questionId = mockSession.questionIds[mockSession.currentIndex];
  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question) notFound();

  const instructions = PRACTICE_INSTRUCTIONS[question.questionTypeId];
  const total = mockSession.questionIds.length;
  const isLast = mockSession.currentIndex === total - 1;

  const advance = submitMockAnswerAndAdvance.bind(null, sessionId, question.id);
  const DEFAULT_TIMER_SECONDS = 45;
  // Dạng Speaking: không dùng đồng hồ chung của khung thi. Bộ ghi âm đã tự đếm
  // chuẩn bị + ghi âm và tự dừng; đồng hồ chung đếm từ lúc mở câu (chưa tính
  // thời gian nghe audio/bấm bắt đầu) nên có thể chuyển câu khi học viên đang
  // nói dở và làm mất bài nói.
  const isSpeaking = QUESTION_TYPES.find((t) => t.id === question.questionTypeId)?.skill === "speaking";
  // Speaking: chỉ gửi kèm file ghi âm khi câu này đang là bài nộp chờ giáo viên
  // chấm; lượt Mock test gắn bài tập thì báo cho server để gắn bài nộp vào đúng
  // bài tập của lượt này (server kiểm tra lại cả hai khi nộp).
  const collectAudio = isSpeaking
    ? await shouldCollectAssignmentAudio(userId, question.id, question.questionTypeId)
    : false;
  const mockSessionId = mockSession.assignmentId ? mockSession.id : undefined;
  const timerSeconds = isSpeaking
    ? null
    : (instructions?.prepSeconds ?? 0) + (instructions?.recordSeconds ?? instructions?.timeLimitSeconds ?? 0) ||
      DEFAULT_TIMER_SECONDS;

  return (
    <MockExamShell
      title="PTE Academic · Mock Test"
      resetKey={question.id}
      index={mockSession.currentIndex + 1}
      total={total}
      timerSeconds={timerSeconds}
      advanceAction={advance}
      isLast={isLast}
    >
      <div className="flex flex-col gap-4">
        {instructions ? (
          renderExamPlayer(
            question.questionTypeId,
            question.id,
            question.content as Record<string, unknown>,
            instructions,
            { collectAudio, mockSessionId }
          )
        ) : (
          <p className="text-center text-[15px] text-neutral-500">
            Dạng câu hỏi này chưa hỗ trợ trong Mocktest.
          </p>
        )}
      </div>
    </MockExamShell>
  );
}
