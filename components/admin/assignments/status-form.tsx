import { setAssignmentStatusAction } from "@/lib/actions/assignments";
import { ConfirmSubmitButton, SubmitButton } from "@/components/admin/classes/form-buttons";
import type { AssignmentStatus } from "@/lib/generated/prisma/enums";

/** Nút đổi trạng thái bài tập (form gửi thẳng server action — action tự kiểm
 * tra quyền + phạm vi lớp). */
function StatusForm({
  assignmentId,
  status,
  label,
  pendingLabel,
  srContext,
  confirm = false,
  danger = false,
}: {
  assignmentId: string;
  status: AssignmentStatus;
  label: string;
  pendingLabel: string;
  srContext?: string;
  /** Cần bấm xác nhận lần 2 (lưu trữ). */
  confirm?: boolean;
  danger?: boolean;
}) {
  return (
    <form action={setAssignmentStatusAction} className="inline-flex">
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <input type="hidden" name="status" value={status} />
      {confirm ? (
        <ConfirmSubmitButton label={label} confirmLabel={`Xác nhận ${label.toLowerCase()}`} pendingLabel={pendingLabel} srContext={srContext} />
      ) : (
        <SubmitButton className={danger ? "adm-btn-sm adm-btn-danger" : "adm-btn-sm"} pendingLabel={pendingLabel}>
          {label}
          {srContext && <span className="sr-only"> {srContext}</span>}
        </SubmitButton>
      )}
    </form>
  );
}

type StatusButtonProps = {
  assignmentId: string;
  status: AssignmentStatus;
  title: string;
  /** Lớp còn đang học / sắp khai giảng — chỉ khi đó mới được "Mở lại" bài đã đóng. */
  classOpen: boolean;
};

/** Nút chính trên bảng danh sách: Đóng (đang mở) · Mở lại (đã đóng, lớp còn học) · Bỏ lưu trữ. */
export function ToggleStatusButton({ assignmentId, status, title, classOpen }: StatusButtonProps) {
  const ctx = `bài “${title}”`;
  if (status === "OPEN") {
    return <StatusForm assignmentId={assignmentId} status="CLOSED" label="Đóng" pendingLabel="Đang đóng…" srContext={ctx} />;
  }
  if (status === "CLOSED") {
    if (!classOpen) {
      return (
        <span className="text-[12px] whitespace-nowrap" style={{ color: "var(--adm-ink-3)" }}>
          Lớp đã kết thúc
        </span>
      );
    }
    return <StatusForm assignmentId={assignmentId} status="OPEN" label="Mở lại" pendingLabel="Đang mở…" srContext={ctx} />;
  }
  return <StatusForm assignmentId={assignmentId} status="CLOSED" label="Bỏ lưu trữ" pendingLabel="Đang khôi phục…" srContext={ctx} />;
}

/** Bộ nút đầy đủ ở trang chi tiết: thêm "Lưu trữ" (xác nhận 2 bước). */
export function StatusActions({ assignmentId, status, title, classOpen }: StatusButtonProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ToggleStatusButton assignmentId={assignmentId} status={status} title={title} classOpen={classOpen} />
      {status !== "ARCHIVED" && (
        <StatusForm
          assignmentId={assignmentId}
          status="ARCHIVED"
          label="Lưu trữ"
          pendingLabel="Đang lưu trữ…"
          srContext={`bài “${title}”`}
          confirm
        />
      )}
    </div>
  );
}
