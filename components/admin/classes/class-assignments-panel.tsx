import Link from "next/link";
import { EmptyState, Panel, Pill } from "@/components/admin/admin-ui";
import { daysUntilExpiry, formatVnDate } from "@/lib/admin/student-status";
import type { AssignmentKind, AssignmentStatus } from "@/lib/generated/prisma/enums";

export interface ClassAssignmentRow {
  id: string;
  title: string;
  kind: AssignmentKind;
  status: AssignmentStatus;
  dueAt: Date | null;
  recipients: number;
  completed: number;
}

const KIND_LABEL: Record<AssignmentKind, string> = {
  PRACTICE: "Luyện đề",
  TU: "Luyện đề Tủ",
  MOCK: "Mock test",
};

const STATUS_META: Record<AssignmentStatus, { label: string; tone: "ok" | "mute" }> = {
  OPEN: { label: "Đang mở", tone: "ok" },
  CLOSED: { label: "Đã đóng", tone: "mute" },
  ARCHIVED: { label: "Lưu trữ", tone: "mute" },
};

/** Panel "Bài tập" ở trang chi tiết lớp: bài đã giao cho lớp + tiến độ nộp.
 * linkToAssignments = người xem mở được trang Giao bài tập (quyền manageAssignments);
 * không có quyền thì chỉ hiện tên bài, không có link. */
export function ClassAssignmentsPanel({
  classId,
  classCode,
  rows,
  totalCount,
  openCount,
  linkToAssignments,
  canCreate,
}: {
  classId: string;
  classCode: string;
  rows: ClassAssignmentRow[];
  /** Tổng số bài của lớp (rows có thể bị cắt bớt). */
  totalCount: number;
  /** Số bài đang mở của lớp. */
  openCount: number;
  linkToAssignments: boolean;
  /** Hiện nút "Giao bài cho lớp" (có quyền giao bài và lớp còn hoạt động). */
  canCreate: boolean;
}) {
  const assignHref = `/admin/assignments?class=${encodeURIComponent(classId)}`;

  return (
    <Panel
      title="Bài tập"
      meta={totalCount > 0 ? `${openCount} đang mở · ${totalCount} bài` : undefined}
      actions={
        canCreate ? (
          <Link href={assignHref} className="adm-btn adm-btn-pri adm-btn-sm">
            Giao bài cho lớp
            <span className="sr-only"> {classCode}</span>
          </Link>
        ) : undefined
      }
    >
      {rows.length === 0 ? (
        <EmptyState>Lớp chưa có bài tập nào.</EmptyState>
      ) : (
        <div className="adm-tw">
          <table className="adm-table">
            <thead>
              <tr>
                <th scope="col">Bài tập</th>
                <th scope="col">Hình thức</th>
                <th scope="col">Hạn nộp</th>
                <th scope="col">Đã nộp</th>
                <th scope="col">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const status = STATUS_META[a.status];
                const daysLeft = a.dueAt ? daysUntilExpiry(a.dueAt) : null;
                const overdue = a.status === "OPEN" && daysLeft !== null && daysLeft < 0;
                return (
                  <tr key={a.id}>
                    <td className="min-w-[200px]">
                      {linkToAssignments ? (
                        <Link href={`/admin/assignments/${a.id}`} className="font-semibold hover:underline">
                          {a.title}
                        </Link>
                      ) : (
                        <span className="font-semibold">{a.title}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap">{KIND_LABEL[a.kind]}</td>
                    <td className="whitespace-nowrap">
                      {a.dueAt ? (
                        <div className="flex flex-col items-start gap-0.5">
                          <span className="adm-num">{formatVnDate(a.dueAt)}</span>
                          {overdue && (
                            <span className="text-[12px] font-semibold" style={{ color: "var(--adm-brand-text)" }}>
                              Quá hạn {-(daysLeft ?? 0)} ngày
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: "var(--adm-ink-3)" }}>Không hạn</span>
                      )}
                    </td>
                    <td className="adm-num whitespace-nowrap">
                      {a.completed}/{a.recipients}
                    </td>
                    <td className="whitespace-nowrap">
                      <Pill tone={status.tone}>{status.label}</Pill>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {totalCount > rows.length && (
        <p className="border-t px-4 py-2.5 text-[12.5px]" style={{ borderColor: "var(--adm-line)", color: "var(--adm-ink-3)" }}>
          Đang hiện {rows.length}/{totalCount} bài gần nhất.
          {linkToAssignments && (
            <>
              {" "}
              <Link href={assignHref} className="font-semibold underline underline-offset-2">
                Xem tất cả bài của lớp
              </Link>
            </>
          )}
        </p>
      )}
    </Panel>
  );
}
