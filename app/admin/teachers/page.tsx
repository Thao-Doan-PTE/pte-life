import Link from "next/link";
import { can, requireAdminPage } from "@/lib/admin/permissions";
import { getTeacherRoster } from "@/lib/admin/teacher-queries";
import { AdminContent, AdminPageHeader, Kpi, Panel } from "@/components/admin/admin-ui";
import { TeacherTable } from "@/components/admin/teachers/teacher-table";

/** Giáo viên (HANDOFF mục 4.7) — chỉ Admin / Trưởng học thuật. */
export default async function AdminTeachersPage() {
  const user = await requireAdminPage("viewTeachers");
  const roster = await getTeacherRoster();
  const canManageUsers = can(user, "manageUsers");

  return (
    <>
      <AdminPageHeader
        title="Giáo viên"
        sub={`${roster.rows.length} giáo viên · chuyên môn, lớp phụ trách, số học viên, bài chờ chấm`}
        actions={
          canManageUsers ? (
            <Link href="/admin/users" className="adm-btn adm-btn-sm">
              Phân quyền người dùng
            </Link>
          ) : undefined
        }
      />
      <AdminContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Kpi
            label="Giáo viên đang hoạt động"
            value={roster.activeTeacherCount}
            hint={`Trên ${roster.rows.length} tài khoản giáo viên`}
          />
          <Kpi
            label="Lớp chưa có giáo viên"
            value={roster.openClassesWithoutTeacher}
            hint="Lớp đang học / sắp khai giảng"
            href={roster.openClassesWithoutTeacher > 0 ? "/admin/classes?status=all" : undefined}
            alert={roster.openClassesWithoutTeacher > 0}
          />
          <Kpi
            label="Học viên đang được dạy"
            value={roster.taughtStudentCount}
            hint="Không trùng, trong các lớp còn hoạt động"
          />
        </div>

        <Panel
          title="Danh sách giáo viên"
          meta="Số học viên tính trên lớp đang học & sắp khai giảng; bài chờ chấm tính trên mọi lớp phụ trách"
        >
          <TeacherTable
            rows={roster.rows}
            canEditSpecialty={can(user, "viewTeachers")}
            pendingHref={can(user, "gradeSubmissions") ? "/admin/grading" : null}
            emptyHint={
              canManageUsers ? (
                <>
                  Gán role Giáo viên tại{" "}
                  <Link href="/admin/users" className="underline">
                    Người dùng &amp; phân quyền
                  </Link>
                  .
                </>
              ) : undefined
            }
          />
        </Panel>
      </AdminContent>
    </>
  );
}
