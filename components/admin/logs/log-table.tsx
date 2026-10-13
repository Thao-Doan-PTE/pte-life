import Link from "next/link";
import { EmptyState, MutedText } from "@/components/admin/admin-ui";
import { formatVnDateTime } from "@/lib/admin/student-status";
import { LOG_CATEGORY_LABEL, type LogDetails, type LogEntry, type LogTypeFilter } from "@/lib/admin/log-queries";
import { logsHref } from "@/components/admin/logs/log-filters";

/** "Chi tiết" mở/đóng không cần JavaScript: các trường thay đổi (trước → sau) và IP. */
function LogDetailsBlock({ details }: { details: LogDetails }) {
  return (
    <details className="mt-1.5">
      <summary className="w-fit cursor-pointer text-[12.5px] font-semibold" style={{ color: "var(--adm-ink-2)" }}>
        Chi tiết
      </summary>
      <div
        className="mt-1.5 flex flex-col gap-2 rounded-lg border p-2.5 font-mono text-[12px] leading-[1.5]"
        style={{ borderColor: "var(--adm-line)", background: "var(--adm-surface)" }}
      >
        {details.changes.length > 0 ? (
          <dl className="flex flex-col gap-1.5">
            {details.changes.map((c) => (
              <div key={c.key || "_"}>
                <dt className="font-semibold" style={{ color: "var(--adm-ink-2)" }}>
                  {c.key || "Dữ liệu"}
                </dt>
                <dd className="flex flex-wrap items-baseline gap-x-1.5 break-all whitespace-pre-wrap">
                  <span style={{ color: "var(--adm-ink-3)" }}>
                    <span className="sr-only">Trước: </span>
                    {c.before}
                  </span>
                  <span aria-hidden="true">→</span>
                  <span>
                    <span className="sr-only">, sau: </span>
                    {c.after}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p style={{ color: "var(--adm-ink-3)" }}>Không có dữ liệu trước/sau.</p>
        )}
        {details.ip && (
          <p style={{ color: "var(--adm-ink-3)" }}>
            IP: <span style={{ color: "var(--adm-ink-2)" }}>{details.ip}</span>
          </p>
        )}
      </div>
    </details>
  );
}

/** Bảng nhật ký (chỉ đọc), mới nhất lên trước. */
export function LogTable({ entries, filtered }: { entries: LogEntry[]; filtered: boolean }) {
  if (entries.length === 0) {
    return <EmptyState>{filtered ? "Không có thao tác nào khớp bộ lọc." : "Chưa có thao tác nào."}</EmptyState>;
  }
  return (
    <div className="adm-tw">
      <table className="adm-table">
        <thead>
          <tr>
            <th scope="col">Thời gian</th>
            <th scope="col">Nội dung</th>
            <th scope="col">Người thao tác</th>
            <th scope="col">Loại</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.key}>
              <td className="adm-num whitespace-nowrap" style={{ color: "var(--adm-ink-2)" }}>
                <time dateTime={e.createdAt.toISOString()}>{formatVnDateTime(e.createdAt)}</time>
              </td>
              <td className="min-w-[240px] break-words">
                <span className="block">{e.content}</span>
                {e.targetName && <MutedText className="block">Đối tượng: {e.targetName}</MutedText>}
                {e.details && <LogDetailsBlock details={e.details} />}
              </td>
              <td className="min-w-[140px]">
                <span className="block font-medium">{e.actorName}</span>
                {e.actorRoleLabel && (
                  <MutedText className="block">
                    {e.actorRoleLabel}
                    {e.actorRoleIsCurrent && " (hiện tại)"}
                  </MutedText>
                )}
              </td>
              <td>
                <span className="adm-tag whitespace-nowrap">{LOG_CATEGORY_LABEL[e.category]}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Phân trang đơn giản: Trang trước / Trang sau. */
export function LogPagination({
  page,
  totalPages,
  total,
  type,
  q,
}: {
  page: number;
  totalPages: number;
  total: number;
  type: LogTypeFilter;
  q: string;
}) {
  return (
    <nav
      aria-label="Phân trang nhật ký"
      className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3"
      style={{ borderColor: "var(--adm-line)" }}
    >
      <MutedText>
        Trang <span className="adm-num">{page}</span>/<span className="adm-num">{totalPages}</span> ·{" "}
        <span className="adm-num">{total}</span> thao tác
      </MutedText>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={logsHref({ type, q, page: page - 1 })} className="adm-btn adm-btn-sm" rel="prev">
            ← Trang trước
          </Link>
        ) : (
          <span className="adm-btn adm-btn-sm" aria-disabled="true" style={{ opacity: 0.5 }}>
            ← Trang trước
          </span>
        )}
        {page < totalPages ? (
          <Link href={logsHref({ type, q, page: page + 1 })} className="adm-btn adm-btn-sm" rel="next">
            Trang sau →
          </Link>
        ) : (
          <span className="adm-btn adm-btn-sm" aria-disabled="true" style={{ opacity: 0.5 }}>
            Trang sau →
          </span>
        )}
      </div>
    </nav>
  );
}
