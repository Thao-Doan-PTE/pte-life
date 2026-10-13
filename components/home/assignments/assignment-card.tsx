import Link from "next/link";
import { ArrowRight, MessageSquareText, RotateCcw } from "lucide-react";
import { StageCard } from "@/components/home/stage-intro";
import { StartMockButton } from "@/components/home/assignments/start-mock-button";
import { ASSIGNMENT_KIND_LABEL, DUE_TONE_STYLE, dueLabel } from "@/components/home/assignments/assignment-labels";
import { formatVnDateTime } from "@/lib/admin/student-status";
import type { StudentAssignment, StudentAssignmentItem } from "@/lib/student-assignment-queries";

const chip = "inline-flex items-center rounded-full px-2.5 py-1 text-[13px] font-bold whitespace-nowrap";

function ItemStatus({ item }: { item: StudentAssignmentItem }) {
  if (item.status === "todo") {
    return (
      <span className={chip} style={{ background: "var(--rail-surface)", color: "var(--rail-ink-dim)" }}>
        Chưa làm
      </span>
    );
  }
  if (item.status === "pending") {
    return (
      <span className={chip} style={{ background: "var(--rail-surface)", color: "var(--rail-info)" }}>
        Đã nộp · Chờ chấm
      </span>
    );
  }
  if (item.status === "graded" && item.grade) {
    return (
      <span className={chip} style={{ background: "var(--rail-ok-tint)", color: "var(--rail-ok)" }}>
        GV chấm {item.grade.total}/{item.grade.maxTotal}
      </span>
    );
  }
  return (
    <span className={chip} style={{ background: "var(--rail-ok-tint)", color: "var(--rail-ok)" }}>
      Đã nộp{item.aiScorePct != null ? ` · ${item.aiScorePct}%` : ""}
    </span>
  );
}

function ItemRow({ item, index, closed }: { item: StudentAssignmentItem; index: number; closed: boolean }) {
  const linkClass = "inline-flex items-center gap-1 text-[14px] font-semibold hover:underline";
  return (
    <li className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="w-5 shrink-0 text-right text-[13px] tabular-nums" style={{ color: "var(--rail-ink-dim)" }}>
            {index + 1}.
          </span>
          <span
            className="shrink-0 rounded-md px-1.5 py-0.5 text-[12px] font-bold tracking-wide"
            style={{ background: "var(--rail-red-tint)", color: "var(--rail-red-text)" }}
          >
            {item.typeCode}
          </span>
          <span className="min-w-0 truncate text-[15px]" style={{ color: "var(--rail-ink)" }} title={`${item.questionCode} · ${item.typeName}`}>
            <span className="font-semibold">{item.questionCode}</span>
            <span style={{ color: "var(--rail-ink-dim)" }}> · {item.typeName}</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-7 sm:shrink-0 sm:pl-0">
          <ItemStatus item={item} />
          {item.status === "todo" ? (
            <Link href={item.practiceHref} className={linkClass} style={{ color: "var(--rail-red-text)" }}>
              {closed ? "Luyện câu này" : "Làm bài"} <ArrowRight className="size-3.5" aria-hidden="true" />
              <span className="sr-only"> {item.questionCode}</span>
            </Link>
          ) : (
            <>
              {item.attemptId && (
                <Link href={`/history/${item.attemptId}`} className={linkClass} style={{ color: "var(--rail-red-text)" }}>
                  Xem bài làm<span className="sr-only"> {item.questionCode}</span>
                </Link>
              )}
              <Link href={item.practiceHref} className={linkClass} style={{ color: "var(--rail-ink-dim)" }}>
                <RotateCcw className="size-3.5" aria-hidden="true" /> Làm lại
                <span className="sr-only"> {item.questionCode}</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {item.status === "pending" && item.aiScorePct != null && (
        <p className="m-0 pl-7 text-[13px]" style={{ color: "var(--rail-ink-dim)" }}>
          Điểm AI ước lượng: {item.aiScorePct}% — giáo viên sẽ chấm và nhận xét thêm.
        </p>
      )}

      {item.status === "graded" && item.grade && (
        <div className="ml-7 rounded-xl border border-[var(--rail-line)] p-3" style={{ background: "var(--rail-surface-card)" }}>
          <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[14px] font-bold" style={{ color: "var(--rail-charcoal)" }}>
            <MessageSquareText className="size-4 shrink-0" style={{ color: "var(--rail-red)" }} aria-hidden="true" />
            Giáo viên chấm: {item.grade.total}/{item.grade.maxTotal}
            <span className="text-[13px] font-normal" style={{ color: "var(--rail-ink-dim)" }}>
              · {formatVnDateTime(item.grade.gradedAt)}
              {item.aiScorePct != null ? ` · Điểm AI ${item.aiScorePct}%` : ""}
            </span>
          </p>
          {item.grade.comment ? (
            <p className="mt-1.5 mb-0 text-[14px] leading-relaxed whitespace-pre-line" style={{ color: "var(--rail-ink)" }}>
              {item.grade.comment}
            </p>
          ) : (
            <p className="mt-1 mb-0 text-[13px]" style={{ color: "var(--rail-ink-dim)" }}>
              Giáo viên chưa để lại nhận xét.
            </p>
          )}
        </div>
      )}
    </li>
  );
}

export function AssignmentCard({ assignment }: { assignment: StudentAssignment }) {
  const closed = assignment.status === "CLOSED";
  const completed = assignment.totalCount > 0 && assignment.submittedCount >= assignment.totalCount;
  const due = dueLabel(assignment.dueAt, { completed, closed });
  const pct = assignment.totalCount > 0 ? Math.round((assignment.submittedCount / assignment.totalCount) * 100) : 0;
  const headingId = `assignment-${assignment.id}`;

  return (
    <section aria-labelledby={headingId}>
      <StageCard>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={chip} style={{ background: "var(--rail-red-tint)", color: "var(--rail-red-text)" }}>
            {ASSIGNMENT_KIND_LABEL[assignment.kind]}
          </span>
          <span className={chip} style={{ background: "var(--rail-surface)", color: "var(--rail-ink)" }} title={assignment.className}>
            Lớp {assignment.classCode}
          </span>
          <span className={`${chip} sm:ml-auto`} style={DUE_TONE_STYLE[due.tone]}>
            {due.label}
          </span>
        </div>

        <h3 id={headingId} className="mt-3 mb-1 text-[18px] leading-snug font-bold break-words" style={{ color: "var(--rail-charcoal)" }}>
          {assignment.title}
        </h3>
        <p className="m-0 text-[13px]" style={{ color: "var(--rail-ink-dim)" }}>
          {due.full ?? "Không đặt hạn nộp"} · Giao lúc {formatVnDateTime(assignment.createdAt)}
        </p>
        {assignment.note && (
          <p className="mt-2 mb-0 text-[15px] whitespace-pre-line" style={{ color: "var(--rail-ink)" }}>
            {assignment.note}
          </p>
        )}

        <div className="mt-4">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-[13px] font-semibold" style={{ color: "var(--rail-charcoal)" }}>
            <span>
              Đã nộp {assignment.submittedCount}/{assignment.totalCount} câu
              {assignment.pendingCount > 0 && <span style={{ color: "var(--rail-info)" }}> · {assignment.pendingCount} chờ chấm</span>}
              {assignment.gradedCount > 0 && <span style={{ color: "var(--rail-ok)" }}> · {assignment.gradedCount} đã chấm</span>}
            </span>
            <span>{pct}%</span>
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full"
            style={{ background: "var(--rail-line)" }}
            role="progressbar"
            aria-label={`Tiến độ nộp bài: ${assignment.title}`}
            aria-valuemin={0}
            aria-valuemax={assignment.totalCount}
            aria-valuenow={assignment.submittedCount}
          >
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--rail-red)" }} />
          </div>
        </div>

        {assignment.kind === "MOCK" && !closed && !completed && assignment.totalCount > 0 && (
          <div className="mt-4">
            <StartMockButton assignmentId={assignment.id} title={assignment.title} />
            <p className="mt-1.5 mb-0 text-[13px]" style={{ color: "var(--rail-ink-dim)" }}>
              Làm liền mạch {assignment.totalCount} câu theo giao diện thi thật. Bạn cũng có thể làm từng câu bên dưới.
            </p>
          </div>
        )}

        {closed && !completed && (
          <p className="mt-3 mb-0 text-[13px]" style={{ color: "var(--rail-ink-dim)" }}>
            Bài tập đã đóng — làm câu còn thiếu bây giờ chỉ được tính là tự luyện.
          </p>
        )}

        {assignment.items.length > 0 ? (
          <ol className="m-0 mt-4 flex list-none flex-col divide-y divide-[var(--rail-line)] border-t border-[var(--rail-line)] p-0 pt-3">
            {assignment.items.map((item, i) => (
              <ItemRow key={item.questionId} item={item} index={i} closed={closed} />
            ))}
          </ol>
        ) : (
          <p className="mt-4 mb-0 text-[14px]" style={{ color: "var(--rail-ink-dim)" }}>
            Bài tập chưa có câu hỏi nào.
          </p>
        )}
      </StageCard>
    </section>
  );
}
