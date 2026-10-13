import Form from "next/form";
import Link from "next/link";
import { Search } from "lucide-react";
import { SegLinks } from "@/components/admin/admin-ui";
import { LOG_TYPE_FILTERS, type LogTypeFilter } from "@/lib/admin/log-queries";

/** Dựng URL trang nhật ký giữ nguyên bộ lọc (bỏ tham số mặc định cho gọn). */
export function logsHref({ type, q, page }: { type: LogTypeFilter; q: string; page?: number }): string {
  const params = new URLSearchParams();
  if (type !== "all") params.set("type", type);
  if (q) params.set("q", q);
  if (page && page > 1) params.set("page", String(page));
  const s = params.toString();
  return s ? `/admin/logs?${s}` : "/admin/logs";
}

/** Thanh lọc: nhóm thao tác (link, giữ ô tìm kiếm) + ô tìm theo nội dung (form GET). */
export function LogFilters({ type, q }: { type: LogTypeFilter; q: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SegLinks items={LOG_TYPE_FILTERS.map((f) => ({ label: f.label, href: logsHref({ type: f.value, q }), active: f.value === type }))} />
      <Form action="/admin/logs" role="search" className="flex w-full items-center gap-2 sm:w-auto">
        {type !== "all" && <input type="hidden" name="type" value={type} />}
        <label htmlFor="log-search" className="sr-only">
          Tìm trong nhật ký
        </label>
        <input
          id="log-search"
          name="q"
          type="search"
          defaultValue={q}
          maxLength={100}
          placeholder="Tìm nội dung, tên, mã lớp…"
          className="adm-input min-w-0 flex-1 sm:w-[240px] sm:flex-none"
        />
        <button type="submit" className="adm-btn adm-btn-sm">
          <Search className="size-3.5" aria-hidden="true" />
          <span className="max-sm:sr-only">Tìm</span>
        </button>
        {q && (
          <Link href={logsHref({ type, q: "" })} className="adm-btn adm-btn-sm adm-btn-ghost">
            Xoá tìm
          </Link>
        )}
      </Form>
    </div>
  );
}
