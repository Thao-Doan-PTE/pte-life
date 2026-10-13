import type { ReactNode } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { can, getScopedClassIdsFor, requireAdminPage } from "@/lib/admin/permissions";
import { getAssignmentFormData, listAssignments } from "@/lib/admin/assignment-queries";
import { AdminContent, AdminPageHeader, EmptyState, Panel, SegLinks } from "@/components/admin/admin-ui";
import { AssignmentTable } from "@/components/admin/assignments/assignment-table";
import { CreateAssignmentForm } from "@/components/admin/assignments/create-assignment-form";
import {
  addDaysToIsoDate,
  ASSIGNMENT_FILTERS,
  DEFAULT_DUE_DAYS,
  DUE_MAX_DAYS,
  parseAssignmentFilter,
  todayVnIsoDate,
  type AssignmentFilterKey,
} from "@/components/admin/assignments/assignment-meta";

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Giao bài tập (HANDOFF §4.5). Admin/Trưởng học thuật thấy mọi lớp; giáo viên (kể
 * cả kiêm vận hành) chỉ thấy và giao bài cho lớp mình (giới hạn trong câu truy vấn + kiểm tra lại
 * trong server action). */
export default async function AdminAssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[]; class?: string | string[] }>;
}) {
  const user = await requireAdminPage("manageAssignments");
  const sp = await searchParams;
  const filterKey = parseAssignmentFilter(firstParam(sp.status));
  const filter = ASSIGNMENT_FILTERS.find((f) => f.key === filterKey) ?? ASSIGNMENT_FILTERS[0];

  const scope = await getScopedClassIdsFor(user, "manageAssignments");
  const [{ rows, counts }, formData] = await Promise.all([listAssignments(scope, filterKey), getAssignmentFormData(scope)]);

  // Bị giới hạn theo lớp phụ trách (giáo viên, kể cả giáo viên kiêm vận hành).
  const teacherOnly = scope !== null;
  const requestedClass = firstParam(sp.class);
  // ?class=<id> (nút "Giao bài cho lớp") chỉ chọn sẵn khi lớp nằm trong phạm vi & còn mở.
  const defaultClassId = formData.classes.find((c) => c.id === requestedClass)?.id ?? formData.classes[0]?.id ?? null;
  const today = todayVnIsoDate();

  const hrefFor = (key: AssignmentFilterKey) => {
    const params = new URLSearchParams();
    if (key !== "open") params.set("status", key);
    if (requestedClass && defaultClassId === requestedClass) params.set("class", requestedClass);
    const qs = params.toString();
    return qs ? `/admin/assignments?${qs}` : "/admin/assignments";
  };

  const totalVisible = counts.open + counts.closed;
  let emptyMessage: ReactNode = "Không có bài tập nào ở trạng thái này.";
  if (scope && scope.length === 0) {
    emptyMessage = "Bạn chưa được phân công lớp nào nên chưa có bài tập.";
  } else if (totalVisible + counts.archived === 0) {
    emptyMessage = "Chưa có bài tập nào — dùng form “Giao bài mới” để giao bài đầu tiên.";
  } else if (filterKey === "open") {
    emptyMessage = "Không có bài tập nào đang mở.";
  }

  let formBody: ReactNode;
  if (formData.classes.length === 0) {
    formBody = (
      <EmptyState>
        {teacherOnly ? (
          "Bạn chưa phụ trách lớp nào đang học hoặc sắp khai giảng — liên hệ quản trị để được phân công lớp, sau đó giao bài ở đây."
        ) : (
          <>
            Chưa có lớp nào đang học hoặc sắp khai giảng.{" "}
            {can(user, "manageClasses") ? (
              <Link href="/admin/classes" className="underline">
                Tạo lớp ở trang Lớp học
              </Link>
            ) : (
              "Cần tạo lớp trước khi giao bài."
            )}
          </>
        )}
      </EmptyState>
    );
  } else {
    formBody = (
      <CreateAssignmentForm
        classes={formData.classes}
        questionCounts={formData.questionCounts}
        teacherGradedTypeIds={formData.teacherGradedTypeIds}
        defaultClassId={defaultClassId}
        defaultDueDate={addDaysToIsoDate(today, DEFAULT_DUE_DAYS)}
        minDueDate={today}
        maxDueDate={addDaysToIsoDate(today, DUE_MAX_DAYS)}
      />
    );
  }

  const sub = teacherOnly
    ? `Bài tập của các lớp bạn phụ trách · ${counts.open} bài đang mở`
    : `${counts.open} bài đang mở · ${counts.closed} đã đóng`;

  return (
    <>
      <AdminPageHeader
        title="Giao bài tập"
        sub={sub}
        actions={
          formData.classes.length > 0 ? (
            <a href="#giao-bai-moi" className="adm-btn adm-btn-pri adm-btn-sm min-[1100px]:hidden">
              <Plus className="size-4" aria-hidden="true" />
              Giao bài
            </a>
          ) : undefined
        }
      />
      <AdminContent>
        <div className="grid grid-cols-1 items-start gap-5 min-[1100px]:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Panel
            title={filter.panelTitle}
            meta={`${rows.length} bài`}
            actions={
              <SegLinks
                items={ASSIGNMENT_FILTERS.map((f) => ({
                  label: `${f.label} · ${counts[f.key]}`,
                  href: hrefFor(f.key),
                  active: f.key === filterKey,
                }))}
              />
            }
          >
            <AssignmentTable rows={rows} emptyMessage={emptyMessage} showStatus={filterKey === "all"} />
          </Panel>

          <div id="giao-bai-moi" className="min-w-0 scroll-mt-20">
            <Panel title="Giao bài mới">{formBody}</Panel>
          </div>
        </div>
      </AdminContent>
    </>
  );
}
