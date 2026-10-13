import { Clock, MessageSquareText } from "lucide-react";
import { formatVnDateTime } from "@/lib/admin/student-status";

export interface TeacherGradeCriterion {
  key: string;
  label: string;
  max: number;
  score: number;
}

export interface TeacherGradeData {
  total: number;
  maxTotal: number;
  comment: string | null;
  gradedAt: Date;
  graderName: string | null;
  criteria: TeacherGradeCriterion[];
}

/** AttemptGrade.criteria là JSON [{ key, label, max, score }] — đọc an toàn, bỏ dòng lỗi. */
export function parseGradeCriteria(value: unknown): TeacherGradeCriterion[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((c) => {
      const row = (c ?? {}) as Record<string, unknown>;
      return {
        key: String(row.key ?? ""),
        label: String(row.label ?? row.key ?? ""),
        max: Number(row.max),
        score: Number(row.score),
      };
    })
    .filter((c) => c.label && Number.isFinite(c.max) && c.max > 0 && Number.isFinite(c.score));
}

/** Điểm + nhận xét giáo viên cho 1 bài làm thuộc bài tập được giao. Lưu riêng,
 * không thay điểm AI ở dưới (quyết định 12A). */
export function TeacherGradePanel({ grade, assignmentTitle }: { grade: TeacherGradeData; assignmentTitle: string | null }) {
  return (
    <section aria-labelledby="teacher-grade-heading" className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="teacher-grade-heading" className="flex items-center gap-2 text-[16px] font-semibold">
          <MessageSquareText className="size-4 shrink-0 text-primary" aria-hidden="true" />
          Giáo viên chấm
        </h2>
        <p className="text-[15px] font-semibold tabular-nums">
          <span className="text-2xl font-bold">{grade.total}</span>
          <span className="text-muted-foreground"> / {grade.maxTotal}</span>
        </p>
      </div>
      <p className="text-[13px] text-muted-foreground">
        {grade.graderName ? `${grade.graderName} · ` : ""}
        {formatVnDateTime(grade.gradedAt)}
        {assignmentTitle ? ` · Bài tập: ${assignmentTitle}` : ""}
      </p>

      {grade.criteria.length > 0 && (
        <ul className="flex flex-col gap-2">
          {grade.criteria.map((c) => {
            const pct = Math.max(0, Math.min(100, Math.round((c.score / c.max) * 100)));
            return (
              <li key={c.key || c.label}>
                <div className="mb-1 flex items-center justify-between gap-3 text-[14px]">
                  <span className="min-w-0">{c.label}</span>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {c.score}/{c.max}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {grade.comment ? (
        <div className="rounded-lg bg-muted/60 p-3">
          <p className="mb-1 text-[13px] font-semibold text-muted-foreground">Nhận xét</p>
          <p className="text-[15px] leading-relaxed whitespace-pre-line">{grade.comment}</p>
        </div>
      ) : (
        <p className="text-[13px] text-muted-foreground">Giáo viên chưa để lại nhận xét.</p>
      )}

      <p className="text-[12px] text-muted-foreground">
        Điểm giáo viên lưu riêng — điểm AI bên dưới và biểu đồ tiến độ giữ nguyên.
      </p>
    </section>
  );
}

/** Bài thuộc bài tập được giao, đang chờ giáo viên chấm. */
export function TeacherGradePending({ assignmentTitle }: { assignmentTitle: string | null }) {
  return (
    <div role="status" className="flex items-start gap-3 rounded-xl border border-dashed bg-card p-4">
      <Clock className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="flex flex-col gap-0.5">
        <p className="text-[15px] font-semibold">Đang chờ giáo viên chấm</p>
        <p className="text-[13px] text-muted-foreground">
          {assignmentTitle ? `Bài nộp cho bài tập "${assignmentTitle}". ` : ""}
          Điểm và nhận xét của giáo viên sẽ hiện ở đây khi chấm xong. Điểm AI bên dưới là điểm ước lượng.
        </p>
      </div>
    </div>
  );
}
