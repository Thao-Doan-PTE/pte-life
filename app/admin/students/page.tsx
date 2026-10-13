import Link from "next/link";
import { AdminContent, AdminPageHeader, MutedText, SegLinks } from "@/components/admin/admin-ui";
import { StudentSearch } from "@/components/admin/students/student-search";
import { StudentTable } from "@/components/admin/students/student-table";
import { can, getScopedClassIds, requireAdminPage } from "@/lib/admin/permissions";
import { EXPIRING_SOON_DAYS, type StudentStatusKey } from "@/lib/admin/student-status";
import {
  filterStudentRows,
  getClassBrief,
  getPlaceableClasses,
  getStudentDetail,
  listStudents,
  type PlaceableClass,
} from "@/lib/admin/student-queries";
import type { ExamPackage } from "@/lib/question-types";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const PKG_OPTIONS: { key: "all" | ExamPackage; label: string }[] = [
  { key: "all", label: "Tất cả gói" },
  { key: "academic", label: "Academic" },
  { key: "core", label: "Core" },
];

/** "attention" = nhóm "Cần xử lý" của Tổng quan (hết hạn + sắp hết hạn, từng
 * được xếp lớp, tài khoản đang mở, không đang bảo lưu). "soon" / "expired" là 2
 * nửa của đúng nhóm đó — cùng lọc theo expiringStudentsWhere ngay trong truy vấn
 * để khớp số "N đã hết hạn · M sắp hết hạn" ở Tổng quan (quyết định 9A), rồi tách
 * theo nhãn trạng thái. "active" / "reserved" lọc theo nhãn trên từng dòng.
 * Mọi bộ lọc trên chỉ gồm người từng được xếp lớp (quyết định 9A); người chưa
 * từng xếp lớp (tự đăng ký / tạo từ Test đầu vào) nằm riêng ở "leads" —
 * "Khách tiềm năng" — để vẫn mở được drawer đổi gói / gia hạn / xếp lớp. */
type StatusFilter = "all" | StudentStatusKey | "attention" | "leads";

/** Các bộ lọc dùng chung điều kiện "Cần xử lý" của Tổng quan. */
const EXPIRING_FILTERS: ReadonlySet<StatusFilter> = new Set<StatusFilter>(["attention", "soon", "expired"]);

const EXPIRING_NOTE: Partial<Record<StatusFilter, string>> = {
  attention: `Cần xử lý: đã hết hạn hoặc còn ≤ ${EXPIRING_SOON_DAYS} ngày`,
  soon: `Sắp hết hạn: còn ≤ ${EXPIRING_SOON_DAYS} ngày`,
  expired: "Hết hạn: đã qua ngày hết hạn",
};

const LEADS_NOTE =
  "Khách tiềm năng: tài khoản học viên chưa từng được xếp lớp (tự đăng ký hoặc tạo từ Test đầu vào) — không tính vào danh sách học viên và số liệu ở Tổng quan. Mở hồ sơ để xếp lớp hoặc chỉnh gói học.";

const STATUS_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "Mọi trạng thái" },
  { key: "active", label: "Đang học" },
  { key: "soon", label: "Sắp hết hạn" },
  { key: "expired", label: "Hết hạn" },
  { key: "reserved", label: "Bảo lưu" },
  { key: "attention", label: "Cần xử lý" },
  { key: "leads", label: "Khách tiềm năng" },
];

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

/** Bộ lọc hiện tại (đã kiểm tra hợp lệ) — giữ trên URL để chia sẻ/tải lại được. */
interface Filters {
  q: string;
  pkg: "all" | ExamPackage;
  status: StatusFilter;
  classId: string;
}

function hrefFor(filters: Filters, overrides: Partial<Filters> = {}): string {
  const f = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (f.q) params.set("q", f.q);
  if (f.pkg !== "all") params.set("pkg", f.pkg);
  if (f.status !== "all") params.set("status", f.status);
  if (f.classId) params.set("class", f.classId);
  const qs = params.toString();
  return qs ? `/admin/students?${qs}` : "/admin/students";
}

export default async function AdminStudentsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireAdminPage("viewStudents");
  const sp = await searchParams;

  const pkgRaw = one(sp.pkg);
  const statusRaw = one(sp.status);
  const filters: Filters = {
    q: one(sp.q).slice(0, 100),
    pkg: pkgRaw === "academic" || pkgRaw === "core" ? pkgRaw : "all",
    status: STATUS_OPTIONS.some((o) => o.key === statusRaw) ? (statusRaw as Filters["status"]) : "all",
    classId: one(sp.class),
  };
  const selectedId = one(sp.student) || null;

  const canManagePlans = can(user, "managePlans");
  const canPlace = can(user, "placeStudents");
  // viewStudents hiện không cấp cho giáo viên; vẫn giới hạn theo lớp ngay trong
  // truy vấn để an toàn nếu sau này phân quyền thay đổi.
  const scopedClassIds = await getScopedClassIds(user);

  const [allRows, classBrief, detail] = await Promise.all([
    listStudents({
      examPackage: filters.pkg === "all" ? undefined : filters.pkg,
      classId: filters.classId || undefined,
      scopedClassIds,
      attention: EXPIRING_FILTERS.has(filters.status),
      placement: filters.status === "leads" ? "never" : "placed",
    }),
    filters.classId ? getClassBrief(filters.classId, scopedClassIds) : Promise.resolve(null),
    selectedId ? getStudentDetail(selectedId, scopedClassIds) : Promise.resolve(null),
  ]);

  const rows = filterStudentRows(allRows, {
    q: filters.q,
    status:
      filters.status === "all" || filters.status === "attention" || filters.status === "leads"
        ? undefined
        : filters.status,
  });

  const placeableClasses: PlaceableClass[] =
    canPlace && detail ? await getPlaceableClasses(detail.row.examPackage) : [];

  const baseHref = hrefFor(filters);

  return (
    <>
      <AdminPageHeader title="Học viên & gói học" sub="Đổi gói, gia hạn, bảo lưu, xếp lớp" />
      <AdminContent>
        <section className="adm-panel min-w-0" aria-label="Danh sách học viên">
          <div className="adm-panel-head">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <StudentSearch defaultValue={filters.q} />
              <SegLinks
                items={PKG_OPTIONS.map((o) => ({
                  label: o.label,
                  href: hrefFor(filters, { pkg: o.key }),
                  active: filters.pkg === o.key,
                }))}
              />
              <SegLinks
                items={STATUS_OPTIONS.map((o) => ({
                  label: o.label,
                  href: hrefFor(filters, { status: o.key }),
                  active: filters.status === o.key,
                }))}
              />
            </div>
            <MutedText>
              <span className="adm-num">{rows.length}</span> học viên · sắp xếp theo hạn gần nhất
            </MutedText>
          </div>

          {EXPIRING_NOTE[filters.status] && (
            <p
              className="border-b px-4 py-2.5 text-[12.5px]"
              style={{ borderColor: "var(--adm-line)", background: "var(--adm-surface)", color: "var(--adm-ink-2)" }}
            >
              {EXPIRING_NOTE[filters.status]}, từng được xếp lớp, tài khoản chưa khoá, không đang bảo lưu — cùng cách
              đếm với số liệu ở Tổng quan. Tài khoản đã khoá xem ở «Mọi trạng thái», tài khoản chưa từng xếp lớp xem ở
              «Khách tiềm năng».
            </p>
          )}

          {filters.status === "leads" && (
            <p
              className="border-b px-4 py-2.5 text-[12.5px]"
              style={{ borderColor: "var(--adm-line)", background: "var(--adm-surface)", color: "var(--adm-ink-2)" }}
            >
              {LEADS_NOTE}
            </p>
          )}

          {filters.classId && (
            <div
              className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5 text-[13px]"
              style={{ borderColor: "var(--adm-line)", background: "var(--adm-surface)" }}
            >
              <span className="adm-pill adm-pill-plum">
                {classBrief ? `Lớp ${classBrief.code}` : "Lớp không tồn tại"}
              </span>
              {classBrief && <span style={{ color: "var(--adm-ink-2)" }}>{classBrief.name}</span>}
              <Link
                href={hrefFor(filters, { classId: "" })}
                scroll={false}
                className="ml-auto font-semibold underline-offset-2 hover:underline"
                style={{ color: "var(--adm-brand-text)" }}
              >
                Bỏ lọc lớp
              </Link>
            </div>
          )}

          <StudentTable
            rows={rows}
            baseHref={baseHref}
            selectedId={selectedId}
            detail={detail}
            placeableClasses={placeableClasses}
            canManagePlans={canManagePlans}
            canPlace={canPlace}
          />
        </section>
      </AdminContent>
    </>
  );
}
