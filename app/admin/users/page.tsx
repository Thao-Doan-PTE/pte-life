import Link from "next/link";
import { AdminContent, AdminPageHeader, EmptyState, Panel, SegLinks } from "@/components/admin/admin-ui";
import { Pager } from "@/components/admin/entry-tests/pager";
import { UserRoleRow } from "@/components/admin/user-role-row";
import { getAllUsersForRoleManagement } from "@/lib/actions/users";
import { requireAdminPage } from "@/lib/admin/permissions";
import type { Role } from "@/lib/generated/prisma/enums";

const PAGE_SIZE = 50;

/** Next.js trả về mảng khi 1 khoá query lặp lại (?q=a&q=b) — chỉ lấy giá trị đầu. */
function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/** Bộ lọc nhanh theo vai trò / trạng thái. */
const FILTERS: { key: string; label: string; match: (u: { roles: Role[]; status: string }) => boolean }[] = [
  { key: "all", label: "Tất cả", match: () => true },
  { key: "ADMIN", label: "Admin", match: (u) => u.roles.includes("ADMIN") },
  { key: "OPS", label: "Vận hành / CSKH", match: (u) => u.roles.includes("OPS") },
  { key: "ACADEMIC_LEAD", label: "Trưởng học thuật", match: (u) => u.roles.includes("ACADEMIC_LEAD") },
  { key: "TEACHER", label: "Giáo viên", match: (u) => u.roles.includes("TEACHER") },
  { key: "STUDENT", label: "Học viên", match: (u) => u.roles.includes("STUDENT") },
  { key: "locked", label: "Đã khoá", match: (u) => u.status !== "ACTIVE" },
];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; role?: string | string[]; page?: string | string[] }>;
}) {
  const admin = await requireAdminPage("manageUsers");
  const users = await getAllUsersForRoleManagement();

  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 100);
  const roleParam = one(sp.role);
  const filter = FILTERS.find((f) => f.key === roleParam) ?? FILTERS[0];

  const needle = q.toLowerCase();
  const searched = needle
    ? users.filter((u) => u.name.toLowerCase().includes(needle) || u.email.toLowerCase().includes(needle))
    : users;
  const filtered = searched.filter(filter.match);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, Math.floor(Number(one(sp.page)) || 1)), pageCount);
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hrefFor = (opts: { role?: string; q?: string; page?: number }) => {
    const params = new URLSearchParams();
    if (opts.q) params.set("q", opts.q);
    if (opts.role && opts.role !== "all") params.set("role", opts.role);
    if (opts.page && opts.page > 1) params.set("page", String(opts.page));
    const qs = params.toString();
    return qs ? `/admin/users?${qs}` : "/admin/users";
  };

  return (
    <>
      <AdminPageHeader
        title="Người dùng & phân quyền"
        sub="Gán vai trò và khoá/mở khoá tài khoản. Một người dùng có thể mang nhiều vai trò."
      />
      <AdminContent>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <SegLinks
            items={FILTERS.map((f) => ({
              label: `${f.label} (${searched.filter(f.match).length})`,
              href: hrefFor({ role: f.key, q }),
              active: f.key === filter.key,
            }))}
          />
          <form action="/admin/users" method="get" role="search" className="flex items-center gap-2">
            {filter.key !== "all" && <input type="hidden" name="role" value={filter.key} />}
            <label htmlFor="user-search" className="sr-only">
              Tìm theo tên hoặc email
            </label>
            <input
              id="user-search"
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Tìm theo tên hoặc email…"
              className="adm-input w-full min-w-0 lg:w-64"
            />
            <button type="submit" className="adm-btn">
              Tìm
            </button>
            {q && (
              <Link href={hrefFor({ role: filter.key })} className="adm-btn adm-btn-ghost">
                Xoá lọc
              </Link>
            )}
          </form>
        </div>

        <Panel title="Danh sách người dùng" meta={`${filtered.length} người`}>
          {pageRows.length === 0 ? (
            <EmptyState>{q ? `Không tìm thấy người dùng nào khớp “${q}”.` : "Không có người dùng nào."}</EmptyState>
          ) : (
            pageRows.map((u) => (
              <UserRoleRow
                key={u.id}
                user={{ id: u.id, name: u.name, email: u.email, roles: u.roles, status: u.status }}
                isSelf={u.id === admin.id}
              />
            ))
          )}
          <Pager
            page={page}
            pageCount={pageCount}
            hrefForPage={(p) => hrefFor({ role: filter.key, q, page: p })}
            label={`${filtered.length} người`}
          />
        </Panel>
      </AdminContent>
    </>
  );
}
