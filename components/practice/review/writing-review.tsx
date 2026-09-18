import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CRITERION_LABELS } from "@/lib/scoring/ai/rubric";
import type { WritingGradeResult, WritingIssueType } from "@/lib/scoring/ai";

const ISSUE_COLOR: Record<WritingIssueType, string> = {
  grammar: "decoration-amber-500 bg-amber-500/10",
  vocabulary: "decoration-sky-500 bg-sky-500/10",
  spelling: "decoration-destructive bg-destructive/10",
  content: "decoration-violet-500 bg-violet-500/10",
  form: "decoration-muted-foreground bg-muted",
};

const ISSUE_LABEL: Record<WritingIssueType, string> = {
  grammar: "Ngữ pháp",
  vocabulary: "Từ vựng",
  spelling: "Chính tả",
  content: "Nội dung",
  form: "Hình thức",
};

function AnnotatedText({
  text,
  issues,
}: {
  text: string;
  issues: WritingGradeResult["issues"];
}) {
  if (issues.length === 0) {
    return <p className="whitespace-pre-line text-sm">{text}</p>;
  }

  // Tìm vị trí xuất hiện đầu tiên của mỗi "quote" trong bài làm để highlight,
  // tránh phải tin model đếm chính xác vị trí ký tự (không đáng tin cậy).
  const matches = issues
    .map((issue) => ({ issue, index: text.indexOf(issue.quote) }))
    .filter((m) => m.index !== -1 && m.issue.quote.length > 0)
    .sort((a, b) => a.index - b.index);

  const parts: ReactNode[] = [];
  let cursor = 0;
  matches.forEach((m, i) => {
    if (m.index < cursor) return; // bỏ qua overlap
    parts.push(text.slice(cursor, m.index));
    parts.push(
      <span
        key={i}
        title={`${ISSUE_LABEL[m.issue.type]}: ${m.issue.explanation}`}
        className={cn(
          "rounded px-0.5 underline decoration-2 underline-offset-2",
          ISSUE_COLOR[m.issue.type]
        )}
      >
        {m.issue.quote}
      </span>
    );
    cursor = m.index + m.issue.quote.length;
  });
  parts.push(text.slice(cursor));

  return <p className="whitespace-pre-line text-sm">{parts}</p>;
}

export function WritingReview({
  studentText,
  grade,
}: {
  studentText: string;
  grade: WritingGradeResult;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border bg-card p-4">
        <AnnotatedText text={studentText} issues={grade.issues} />
      </div>

      {grade.issues.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Chi tiết lỗi
          </p>
          {grade.issues.map((issue, i) => (
            <div key={i} className="rounded-lg border p-3 text-sm">
              <p className="font-medium">{ISSUE_LABEL[issue.type]}</p>
              <p className="text-muted-foreground">
                &ldquo;{issue.quote}&rdquo; → <span className="font-medium text-foreground">{issue.suggestion}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{issue.explanation}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase text-muted-foreground">
          Điểm theo tiêu chí
        </p>
        {Object.entries(grade.criteria).map(([key, c]) => (
          <div key={key} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{CRITERION_LABELS[key] ?? key}</span>
              <span className="text-muted-foreground">{c.scorePct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${c.scorePct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{c.feedback}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-muted/40 p-4 text-sm">
        <p className="mb-1 font-medium">Nhận xét chung</p>
        <p className="text-muted-foreground">{grade.generalFeedback}</p>
      </div>
    </div>
  );
}
