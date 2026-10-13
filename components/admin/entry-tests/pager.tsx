import Link from "next/link";

/** Phân trang đơn giản bằng link (Trang trước / Trang sau) — giữ trạng thái trên URL.
 * TODO: chuyển vào components/admin/admin-ui.tsx nếu các trang khác cũng cần. */
export function Pager({
  page,
  pageCount,
  hrefForPage,
  label,
}: {
  page: number;
  pageCount: number;
  hrefForPage: (page: number) => string;
  /** VD "1–50 / 120 lượt". */
  label?: string;
}) {
  if (pageCount <= 1) return null;
  return (
    <nav
      aria-label="Phân trang"
      className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-[13px]"
      style={{ borderColor: "var(--adm-line)", color: "var(--adm-ink-2)" }}
    >
      <span className="adm-num">
        Trang {page}/{pageCount}
        {label ? ` · ${label}` : ""}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={hrefForPage(page - 1)} className="adm-btn adm-btn-sm" rel="prev">
            ← Trang trước
          </Link>
        ) : (
          <span className="adm-btn adm-btn-sm opacity-50" aria-disabled="true">
            ← Trang trước
          </span>
        )}
        {page < pageCount ? (
          <Link href={hrefForPage(page + 1)} className="adm-btn adm-btn-sm" rel="next">
            Trang sau →
          </Link>
        ) : (
          <span className="adm-btn adm-btn-sm opacity-50" aria-disabled="true">
            Trang sau →
          </span>
        )}
      </div>
    </nav>
  );
}
