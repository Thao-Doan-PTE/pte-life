import { daysUntilExpiry, formatVnDate } from "@/lib/admin/student-status";
import type { AssignmentStatus } from "@/lib/generated/prisma/enums";

/** Nhắc hạn nộp tương đối: "Quá hạn N ngày" (đỏ) / "Hôm nay" (cam) / "Còn N ngày".
 * Chỉ áp dụng cho bài đang mở — bài đã đóng thì hạn nộp không còn là việc cần làm. */
export function dueRelative(
  dueAt: Date | null,
  status: AssignmentStatus
): { text: string; color: string; strong: boolean } | null {
  if (!dueAt || status !== "OPEN") return null;
  const days = daysUntilExpiry(dueAt);
  if (days < 0) return { text: `Quá hạn ${-days} ngày`, color: "var(--adm-brand-text)", strong: true };
  if (days === 0) return { text: "Hôm nay", color: "var(--adm-warn)", strong: true };
  return { text: `Còn ${days} ngày`, color: "var(--adm-ink-3)", strong: false };
}

export function DueHint({ dueAt, status }: { dueAt: Date | null; status: AssignmentStatus }) {
  const rel = dueRelative(dueAt, status);
  if (!rel) return null;
  return (
    <span className={rel.strong ? "font-semibold whitespace-nowrap" : "whitespace-nowrap"} style={{ color: rel.color }}>
      {rel.text}
    </span>
  );
}

/** Hạn nộp: ngày (giờ Việt Nam) + nhắc tương đối; "—" nếu không đặt hạn. */
export function DueLabel({
  dueAt,
  status,
  inline = false,
}: {
  dueAt: Date | null;
  status: AssignmentStatus;
  /** true: ngày và nhắc nằm cùng 1 dòng. */
  inline?: boolean;
}) {
  if (!dueAt) return <span style={{ color: "var(--adm-ink-3)" }}>—</span>;
  return (
    <span className={inline ? "inline-flex flex-wrap items-baseline gap-x-2" : "flex flex-col"}>
      <span className="adm-num whitespace-nowrap">{formatVnDate(dueAt)}</span>
      <span className="text-[12.5px]">
        <DueHint dueAt={dueAt} status={status} />
      </span>
    </span>
  );
}
