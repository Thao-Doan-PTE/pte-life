import Link from "next/link";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/admin/admin-ui";
import { formatVnDateTime } from "@/lib/admin/student-status";
import { GRADED_LIST_LIMIT, type QueueItem } from "@/lib/admin/grading-queries";

/** Cột trái trang Chấm bài: hàng chờ (cũ nhất trước) + bài đã chấm gần nhất.
 * Mỗi dòng là link ?attempt=<id> (giữ bộ lọc trên URL) — mở được bằng bàn phím. */
export function GradingQueue({
  pending,
  pendingTotal,
  graded,
  activeId,
  hrefFor,
  className,
}: {
  pending: QueueItem[];
  pendingTotal: number;
  graded: QueueItem[];
  activeId: string | null;
  hrefFor: (attemptId: string) => string;
  className?: string;
}) {
  return (
    <section className={cn("adm-panel min-w-0 overflow-hidden", className)} aria-label="Hàng chờ chấm bài">
      <div className="adm-panel-head">
        <div className="flex min-w-0 items-baseline gap-2">
          <h2>Hàng chờ</h2>
          <span className="adm-num text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
            {pendingTotal} chờ chấm
          </span>
        </div>
        {activeId && (
          // Màn hẹp: hàng chờ nằm trên chi tiết bài → lối tắt tới bài đang chọn.
          <span className="shrink-0 min-[1100px]:hidden">
            <a href="#bai-lam" className="adm-btn adm-btn-ghost adm-btn-sm">
              Xem bài đang chọn
            </a>
          </span>
        )}
      </div>
      {pending.length === 0 ? (
        <EmptyState>Đã chấm hết bài.</EmptyState>
      ) : (
        <>
          <QueueList items={pending} activeId={activeId} hrefFor={hrefFor} />
          {pendingTotal > pending.length && (
            <p className="border-t px-4 py-2 text-[12px]" style={{ borderColor: "var(--adm-line)", color: "var(--adm-ink-3)" }}>
              Đang hiện {pending.length} bài cũ nhất trên tổng {pendingTotal} bài — chấm xong sẽ tự hiện tiếp.
            </p>
          )}
        </>
      )}

      {graded.length > 0 && (
        <>
          <div className="adm-panel-head border-t" style={{ borderTopColor: "var(--adm-line)" }}>
            <div className="flex min-w-0 items-baseline gap-2">
              <h2>Đã chấm</h2>
              <span className="text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
                {graded.length >= GRADED_LIST_LIMIT ? `${GRADED_LIST_LIMIT} bài gần nhất` : `${graded.length} bài`}
              </span>
            </div>
          </div>
          <QueueList items={graded} activeId={activeId} hrefFor={hrefFor} />
        </>
      )}
    </section>
  );
}

function QueueList({
  items,
  activeId,
  hrefFor,
}: {
  items: QueueItem[];
  activeId: string | null;
  hrefFor: (attemptId: string) => string;
}) {
  return (
    <ul className="flex flex-col">
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <li key={item.id} className="border-b last:border-b-0" style={{ borderColor: "var(--adm-line)" }}>
            <Link
              href={hrefFor(item.id)}
              aria-current={active ? "true" : undefined}
              className="flex flex-col gap-0.5 px-4 py-3 transition-colors hover:bg-[var(--adm-surface)]"
              style={active ? { background: "var(--adm-surface)", boxShadow: "inset 3px 0 0 var(--adm-brand)" } : undefined}
            >
              <span className="flex min-w-0 items-center justify-between gap-2">
                <span className="truncate text-[13.5px] font-semibold">{item.studentName}</span>
                <span className="adm-tag shrink-0">{item.typeCode}</span>
              </span>
              <span className="truncate text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
                {item.assignmentTitle}
                {item.classCode && ` · lớp ${item.classCode}`}
              </span>
              {item.graded ? (
                <span className="text-[12.5px] font-medium" style={{ color: "var(--adm-ok)" }}>
                  Đã chấm ·{" "}
                  <span className="adm-num">
                    {item.graded.total}/{item.graded.maxTotal}
                  </span>
                </span>
              ) : (
                <span className="adm-num text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
                  Nộp {formatVnDateTime(item.submittedAt)}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
