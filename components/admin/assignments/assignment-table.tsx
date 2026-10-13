import type { ReactNode } from "react";
import Link from "next/link";
import { EmptyState, Pill, ProgressBar } from "@/components/admin/admin-ui";
import { DueLabel } from "@/components/admin/assignments/due-label";
import { ToggleStatusButton } from "@/components/admin/assignments/status-form";
import { isClassAssignable, KIND_META, percent, STATUS_META } from "@/components/admin/assignments/assignment-meta";
import type { AssignmentListRow } from "@/lib/admin/assignment-queries";

/** Tỷ lệ hoàn thành dưới mức này thì thanh tiến độ tô đỏ (cần nhắc học viên). */
const LOW_COMPLETION_PCT = 60;

/** Bảng bài tập (HANDOFF §4.5, bên trái): tên + hình thức + dạng bài + số câu,
 * lớp, hạn nộp, đã nộp/tổng, thao tác. */
export function AssignmentTable({
  rows,
  emptyMessage,
  showStatus,
}: {
  rows: AssignmentListRow[];
  emptyMessage: ReactNode;
  /** Hiện nhãn trạng thái (tab gộp nhiều trạng thái). */
  showStatus: boolean;
}) {
  if (rows.length === 0) return <EmptyState>{emptyMessage}</EmptyState>;

  return (
    <div className="adm-tw">
      <table className="adm-table min-w-[620px]">
        <thead>
          <tr>
            <th scope="col">Bài tập</th>
            <th scope="col">Lớp</th>
            <th scope="col">Hạn nộp</th>
            <th scope="col">Đã nộp</th>
            <th scope="col">
              <span className="sr-only">Thao tác</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => {
            const kind = KIND_META[a.kind];
            const pct = percent(a.recipientsCompleted, a.recipientsTotal);
            return (
              <tr key={a.id}>
                <td className="min-w-[210px]">
                  <Link href={`/admin/assignments/${a.id}`} className="font-semibold text-balance hover:underline">
                    {a.title}
                  </Link>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Pill tone={kind.tone}>{kind.label}</Pill>
                    {showStatus && a.status !== "OPEN" && <Pill tone={STATUS_META[a.status].tone}>{STATUS_META[a.status].label}</Pill>}
                    {a.typeCodes.map((code) => (
                      <span key={code} className="adm-tag">
                        {code}
                      </span>
                    ))}
                    <span className="adm-num text-[12.5px] whitespace-nowrap" style={{ color: "var(--adm-ink-3)" }}>
                      {a.itemCount} câu
                    </span>
                  </div>
                </td>
                <td className="whitespace-nowrap">
                  <Link href={`/admin/classes/${a.class.id}`} className="adm-num font-semibold hover:underline" title={a.class.name}>
                    {a.class.code}
                  </Link>
                </td>
                <td>
                  <DueLabel dueAt={a.dueAt} status={a.status} />
                </td>
                <td className="min-w-[140px]">
                  {a.recipientsTotal > 0 ? (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="adm-num shrink-0 font-semibold">
                          {a.recipientsCompleted}/{a.recipientsTotal}
                        </span>
                        {/* Số liệu đã có ở chữ bên cạnh → ẩn thanh khỏi trình đọc màn hình. */}
                        <span aria-hidden="true" className="flex min-w-[60px] flex-1">
                          <ProgressBar value={pct} red={pct < LOW_COMPLETION_PCT} />
                        </span>
                      </div>
                      <span className="text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
                        {a.recipientsSubmitted} HV đã nộp ≥1 câu
                        {a.pendingReview > 0 && (
                          <>
                            {" · "}
                            <span style={{ color: "var(--adm-brand-text)" }}>{a.pendingReview} chờ chấm</span>
                          </>
                        )}
                      </span>
                    </div>
                  ) : (
                    <span style={{ color: "var(--adm-ink-3)" }}>0/0</span>
                  )}
                </td>
                <td className="text-right whitespace-nowrap">
                  <div className="inline-flex flex-col items-stretch gap-1.5">
                    <Link href={`/admin/assignments/${a.id}`} className="adm-btn adm-btn-sm adm-btn-ghost">
                      Xem<span className="sr-only"> bài “{a.title}”</span>
                    </Link>
                    <ToggleStatusButton
                      assignmentId={a.id}
                      status={a.status}
                      title={a.title}
                      classOpen={isClassAssignable(a.class.status)}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
