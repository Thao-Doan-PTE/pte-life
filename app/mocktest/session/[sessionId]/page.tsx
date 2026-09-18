import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/app-shell";
import { renderPracticePlayer } from "@/components/practice/practice-player-switch";
import { advanceMockTestSession } from "@/lib/actions/mocktest";
import { mockTestSessionLabel } from "@/lib/mocktest-label";
import { QUESTION_TYPES } from "@/lib/question-types";
import { PRACTICE_INSTRUCTIONS } from "@/lib/practice-config";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default async function MockTestSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
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

  const questionType = QUESTION_TYPES.find((t) => t.id === question.questionTypeId);
  const instructions = PRACTICE_INSTRUCTIONS[question.questionTypeId];
  const total = mockSession.questionIds.length;
  const isLast = mockSession.currentIndex === total - 1;

  const advance = advanceMockTestSession.bind(null, sessionId);

  return (
    <AppShell>
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-5 pb-24 pt-6 sm:px-10">
        <div className="flex flex-col gap-2 border-b pb-4">
          <p className="text-sm font-medium text-primary">
            {mockTestSessionLabel(mockSession)}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
                {question.code}
              </span>
              <span className="text-xs text-muted-foreground">
                {questionType?.name}
              </span>
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              Câu {mockSession.currentIndex + 1}/{total}
            </span>
          </div>
        </div>

        {instructions ? (
          renderPracticePlayer(
            question.questionTypeId,
            question.id,
            question.content as Record<string, unknown>,
            instructions
          )
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            Dạng câu hỏi này chưa hỗ trợ trong Mocktest.
          </p>
        )}

        <form action={advance} className="flex justify-center">
          <Button
            type="submit"
            className="gap-1 bg-brand-accent text-brand-accent-foreground hover:bg-brand-accent/90"
          >
            {isLast ? "Hoàn thành & Xem kết quả" : "Câu tiếp"}
            <ArrowRight className="size-4" />
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
