import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreResultBanner } from "@/components/practice/review/score-result-banner";
import { renderAttemptReview } from "@/components/history/attempt-review-switch";
import { getAttemptDetail } from "@/lib/history-queries";
import { RULE_BASED_TYPE_IDS } from "@/lib/scoring/rule-based";
import { QUESTION_TYPES, SKILL_LABELS } from "@/lib/question-types";
import { formatRelativeOrDate } from "@/lib/format";
import { ChevronLeft } from "lucide-react";

export default async function HistoryDetailPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const attempt = await getAttemptDetail(userId, attemptId);
  if (!attempt) notFound();

  const type = QUESTION_TYPES.find((t) => t.id === attempt.questionTypeId);
  const isRuleBased = RULE_BASED_TYPE_IDS.has(attempt.questionTypeId);

  return (
    <AppShell>
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-6 sm:px-10">
        <Link
          href="/history"
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" /> Lịch sử luyện tập
        </Link>

        <div className="flex flex-col gap-2 border-b pb-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{attempt.question.code}</Badge>
            <Badge variant="outline">{type?.name ?? attempt.questionTypeId}</Badge>
            <span className="text-xs text-muted-foreground">
              {SKILL_LABELS[attempt.question.skill]}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Làm lúc {formatRelativeOrDate(attempt.createdAt.toISOString())}
          </p>
        </div>

        {renderAttemptReview(
          attempt.questionTypeId,
          attempt.question.content as Record<string, unknown>,
          attempt.response
        )}

        <ScoreResultBanner
          scorePct={attempt.scorePct}
          pteScore={attempt.pteScore}
          correct={attempt.isCorrect}
          method={isRuleBased ? "rule-based" : "ai"}
        />

        <Button
          className="self-center bg-brand-accent text-brand-accent-foreground hover:bg-brand-accent/90"
          nativeButton={false}
          render={
            <Link
              href={`/practice/${attempt.question.skill}/${attempt.questionTypeId}/${attempt.questionId}`}
            />
          }
        >
          Luyện lại câu này
        </Button>
      </div>
    </AppShell>
  );
}
