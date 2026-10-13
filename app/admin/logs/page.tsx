import { AdminContent, AdminPageHeader, Panel } from "@/components/admin/admin-ui";
import { LogFilters } from "@/components/admin/logs/log-filters";
import { LogPagination, LogTable } from "@/components/admin/logs/log-table";
import { requireAdminPage } from "@/lib/admin/permissions";
import { getActivityLogPage, parseLogTypeFilter } from "@/lib/admin/log-queries";

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Nhật ký thao tác (HANDOFF.md mục 4.9) — gộp ReservationLog (gói học) và
 * AuditLog (lớp học, người dùng, bài tập, chấm bài…). Trang chỉ đọc; chỉ Admin
 * và Vận hành/CSKH (viewLogs) — kiểm tra ở server trước khi đọc dữ liệu. */
export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireAdminPage("viewLogs");

  const params = await searchParams;
  const type = parseLogTypeFilter(firstParam(params.type));
  const q = (firstParam(params.q) ?? "").trim().slice(0, 100);
  const page = Number(firstParam(params.page) ?? "1");

  const result = await getActivityLogPage({ type, q, page: Number.isFinite(page) ? page : 1 });

  return (
    <>
      <AdminPageHeader
        title="Nhật ký thao tác"
        sub="Mọi thay đổi gói học, hạn, bảo lưu, lớp học, bài tập, chấm bài và phân quyền"
      />
      <AdminContent>
        <LogFilters type={type} q={q} />
        {/* overflow-hidden + bo góc trong để nền tiêu đề bảng không tràn ra góc panel */}
        <Panel bodyClassName="flex flex-col overflow-hidden rounded-[11px]">
          <LogTable entries={result.entries} filtered={type !== "all" || q !== ""} />
          {result.total > 0 && (
            <LogPagination page={result.page} totalPages={result.totalPages} total={result.total} type={type} q={q} />
          )}
        </Panel>
        <p className="text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
          Vai trò người thao tác lấy theo lúc thao tác; dòng cũ chưa lưu vai trò thì hiện theo quyền hiện tại của tài khoản
          (ghi “hiện tại”). Nhật ký chỉ để xem, không sửa hoặc xoá được.
        </p>
      </AdminContent>
    </>
  );
}
