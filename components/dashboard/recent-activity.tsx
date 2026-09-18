import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  QUESTION_TYPES,
  SKILL_LABELS,
} from "@/lib/question-types";
import type { RecentAttempt } from "@/lib/mock-dashboard";
import { formatRelativeOrDate, scoreColorClass } from "@/lib/format";

export function RecentActivity({ attempts }: { attempts: RecentAttempt[] }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Luyện gần đây</h2>
        <Link
          href="/history"
          className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Xem tất cả <ArrowRight className="size-3.5" />
        </Link>
      </div>
      <div className="flex flex-col divide-y rounded-xl border bg-card">
        {attempts.map((attempt) => {
          const type = QUESTION_TYPES.find(
            (q) => q.id === attempt.questionTypeId
          );
          return (
            <Link
              key={attempt.id}
              href={`/practice/${attempt.skill}/${attempt.questionTypeId}`}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Badge variant="secondary" className="shrink-0">
                  {SKILL_LABELS[attempt.skill]}
                </Badge>
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {type?.name ?? attempt.questionTypeId}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {attempt.questionCode}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className={`font-semibold ${scoreColorClass(attempt.scorePct)}`}>
                  {attempt.scorePct}%
                </span>
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  {formatRelativeOrDate(attempt.attemptedAt)}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
