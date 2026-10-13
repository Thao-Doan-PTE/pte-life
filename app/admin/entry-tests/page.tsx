import { AdminContent, AdminPageHeader, Panel, SegLinks } from "@/components/admin/admin-ui";
import { EntryTestTable } from "@/components/admin/entry-tests/entry-test-table";
import { ConsultationPanel } from "@/components/admin/entry-tests/consultation-panel";
import { Pager } from "@/components/admin/entry-tests/pager";
import { can, getScopedClassIdsFor, requireAdminPage } from "@/lib/admin/permissions";
import {
  ENTRY_TEST_ADMIN_PAGE_SIZE,
  ENTRY_TEST_SCALE,
  getEntryTestAdminList,
  getEntryTestFilterCounts,
  getNewConsultationRequests,
  type EntryTestPlacementFilter,
} from "@/lib/admin/entry-test-admin-queries";

/** Test đầu vào (HANDOFF §4.3) — trang xem kết quả. Admin, Vận hành/CSKH, Trưởng
 * học thuật xem mọi lượt test; Giáo viên thuần chỉ xem người làm test đang học ở
 * lớp mình (lọc ngay trong truy vấn) và không có thao tác. */
export default async function AdminEntryTestsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; page?: string }>;
}) {
  const user = await requireAdminPage("viewEntryTests");
  // Cùng phạm vi với trang chi tiết /admin/entry-tests/[attemptId].
  const scopedClassIds = await getScopedClassIdsFor(user, "viewEntryTests");
  const isTeacherScope = scopedClassIds !== null;
  const canViewStudents = can(user, "viewStudents");

  const sp = await searchParams;
  const filter: EntryTestPlacementFilter =
    !isTeacherScope && (sp.filter === "unplaced" || sp.filter === "placed") ? sp.filter : "all";
  const requestedPage = Math.max(1, Math.floor(Number(sp.page) || 1));

  const [list, filterCounts, consultations] = await Promise.all([
    getEntryTestAdminList({ filter, page: requestedPage, scopedClassIds }),
    isTeacherScope ? Promise.resolve(null) : getEntryTestFilterCounts(scopedClassIds),
    canViewStudents ? getNewConsultationRequests() : Promise.resolve(null),
  ]);

  const hrefFor = (f: EntryTestPlacementFilter, page = 1) => {
    const params = new URLSearchParams();
    if (f !== "all") params.set("filter", f);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return qs ? `/admin/entry-tests?${qs}` : "/admin/entry-tests";
  };

  const from = list.total === 0 ? 0 : (list.page - 1) * ENTRY_TEST_ADMIN_PAGE_SIZE + 1;
  const to = Math.min(list.total, list.page * ENTRY_TEST_ADMIN_PAGE_SIZE);
  const autoParts = ENTRY_TEST_SCALE.autoSections.map((s) => `${s.nameVi} (${s.name}) ${s.max}`).join(" + ");
  const teacherParts = ENTRY_TEST_SCALE.teacherSections.map((s) => `${s.name} ${s.max}`).join(", ");

  const emptyText = isTeacherScope
    ? "Chưa có học viên nào trong lớp bạn phụ trách đã nộp test đầu vào."
    : filter === "unplaced"
      ? "Không có người làm test nào đang chờ xếp lớp."
      : filter === "placed"
        ? "Chưa có người làm test nào được xếp lớp."
        : "Chưa có ai nộp test đầu vào.";

  return (
    <>
      <AdminPageHeader
        title="Test đầu vào"
        sub={
          isTeacherScope
            ? "Kết quả test của học viên lớp bạn phụ trách · chỉ xem"
            : "Kết quả test đầu vào và tình trạng xếp lớp"
        }
      />
      <AdminContent>
        <Panel
          title="Kết quả test đầu vào"
          meta={`${list.total} lượt`}
          actions={
            filterCounts && (
              <SegLinks
                items={[
                  { label: `Tất cả (${filterCounts.all})`, href: hrefFor("all"), active: filter === "all" },
                  {
                    label: `Chưa xếp lớp (${filterCounts.unplaced})`,
                    href: hrefFor("unplaced"),
                    active: filter === "unplaced",
                  },
                  { label: `Đã xếp lớp (${filterCounts.placed})`, href: hrefFor("placed"), active: filter === "placed" },
                ]}
              />
            )
          }
        >
          <p
            className="border-b px-4 py-2.5 text-[12.5px] leading-relaxed"
            style={{ borderColor: "var(--adm-line)", color: "var(--adm-ink-3)" }}
          >
            Thang điểm thô {ENTRY_TEST_SCALE.totalMax} của đề hiện tại (không phải thang PTE 10–90). Điểm tự chấm = {autoParts}{" "}
            (tối đa {ENTRY_TEST_SCALE.autoMax}); {teacherParts} chờ giáo viên chấm. Trình độ tạm xếp theo % phần tự chấm.
            Lộ trình gợi ý cần ngưỡng quy đổi được duyệt trước khi hiển thị.
          </p>
          <EntryTestTable rows={list.rows} showActions={canViewStudents} emptyText={emptyText} />
          <Pager
            page={list.page}
            pageCount={list.pageCount}
            hrefForPage={(p) => hrefFor(filter, p)}
            label={`${from}–${to} / ${list.total} lượt`}
          />
        </Panel>

        {consultations && <ConsultationPanel rows={consultations.rows} total={consultations.total} />}
      </AdminContent>
    </>
  );
}
