import Link from "next/link";
import { EmptyState, PersonCell, Pill, ProgressBar } from "@/components/admin/admin-ui";
import { percent } from "@/components/admin/assignments/assignment-meta";
import { formatVnDate } from "@/lib/admin/student-status";
import type { AssignmentDetailRecipient } from "@/lib/admin/assignment-queries";

/** Bảng học viên phải nộp của 1 bài tập: đã nộp x/N câu, chờ chấm, hoàn thành. */
export function RecipientTable({
  assignmentId,
  recipients,
  itemCount,
  overdue,
  canGrade,
}: {
  assignmentId: string;
  recipients: AssignmentDetailRecipient[];
  itemCount: number;
  /** Bài đang mở và đã quá hạn → học viên chưa xong hiện "Trễ hạn". */
  overdue: boolean;
  canGrade: boolean;
}) {
  if (recipients.length === 0) return <EmptyState>Bài tập không có học viên phải nộp.</EmptyState>;

  return (
    <div className="adm-tw">
      <table className="adm-table min-w-[600px]">
        <thead>
          <tr>
            <th scope="col">Học viên</th>
            <th scope="col">Đã nộp</th>
            <th scope="col">Chờ chấm</th>
            <th scope="col">Hoàn thành</th>
          </tr>
        </thead>
        <tbody>
          {recipients.map((r) => (
            <tr key={r.studentId}>
              <td className="min-w-[200px]">
                <PersonCell name={r.name} email={r.email} extra={r.leftClass ? <Pill tone="mute">Đã rời lớp</Pill> : undefined} />
              </td>
              <td className="min-w-[140px]">
                <div className="flex items-center gap-2">
                  <span className="adm-num shrink-0 whitespace-nowrap">
                    {r.submittedCount}/{itemCount} câu
                  </span>
                  {/* Số liệu đã có ở chữ bên cạnh → ẩn thanh khỏi trình đọc màn hình. */}
                  <span aria-hidden="true" className="flex min-w-[60px] flex-1">
                    <ProgressBar value={percent(r.submittedCount, itemCount)} />
                  </span>
                </div>
              </td>
              <td className="whitespace-nowrap">
                {r.pendingCount > 0 ? (
                  canGrade ? (
                    <Link
                      href={`/admin/grading?assignment=${assignmentId}`}
                      className="adm-num font-semibold hover:underline"
                      style={{ color: "var(--adm-brand-text)" }}
                    >
                      {r.pendingCount} bài<span className="sr-only"> của {r.name} chờ chấm — mở Chấm bài</span>
                    </Link>
                  ) : (
                    <span className="adm-num font-semibold" style={{ color: "var(--adm-brand-text)" }}>
                      {r.pendingCount} bài
                    </span>
                  )
                ) : (
                  <span style={{ color: "var(--adm-ink-3)" }}>—</span>
                )}
              </td>
              <td className="whitespace-nowrap">
                {r.completedAt ? (
                  <span className="inline-flex flex-wrap items-center gap-1.5">
                    <Pill tone="ok">Hoàn thành</Pill>
                    <span className="adm-num text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
                      {formatVnDate(r.completedAt)}
                    </span>
                  </span>
                ) : overdue ? (
                  <Pill tone="bad">Trễ hạn</Pill>
                ) : r.submittedCount > 0 ? (
                  <Pill tone="warn">Đang làm</Pill>
                ) : (
                  <Pill tone="mute">Chưa nộp</Pill>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
