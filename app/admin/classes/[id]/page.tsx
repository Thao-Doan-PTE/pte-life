import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { AssignTeacherForm } from "@/components/admin/assign-teacher-form";
import { EnrollStudentForm } from "@/components/admin/enroll-student-form";
import { getClassDetail, removeTeacherAction, removeEnrollmentAction, archiveClassAction } from "@/lib/actions/classes";
import { getUsersByRole } from "@/lib/actions/users";
import { hasAnyRole } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";

export default async function AdminClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || !hasAnyRole(session.user, ["ADMIN", "OPS", "ACADEMIC_LEAD", "TEACHER"])) {
    redirect("/");
  }

  let cls;
  try {
    cls = await getClassDetail(id);
  } catch {
    // TEACHER cố truy cập lớp không thuộc mình — không cho xem, không lộ dữ liệu lớp.
    redirect("/admin/classes");
  }
  if (!cls) notFound();

  const canManage = hasAnyRole(session.user, ["ADMIN", "OPS", "ACADEMIC_LEAD"]);
  const activeEnrollments = cls.enrollments.filter((e) => e.status === "ACTIVE");

  const [allTeachers, allStudents] = canManage
    ? await Promise.all([getUsersByRole("TEACHER"), getUsersByRole("STUDENT")])
    : [[], []];
  const assignedTeacherIds = new Set(cls.teachers.map((t) => t.teacherId));
  const enrolledStudentIds = new Set(activeEnrollments.map((e) => e.studentId));
  const availableTeachers = allTeachers.filter((t) => !assignedTeacherIds.has(t.id));
  const availableStudents = allStudents.filter((s) => !enrolledStudentIds.has(s.id));

  return (
    <AppShell>
      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-5 py-6 sm:px-10">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <Link href="/admin/classes" className="text-xs text-muted-foreground hover:underline">
              ← Lớp học
            </Link>
            <h1 className="text-xl font-semibold">{cls.name}</h1>
            <p className="text-sm text-muted-foreground">
              {cls.code} · {cls.examType === "academic" ? "PTE Academic" : "PTE Core"}
              {cls.targetScore ? ` · Mục tiêu ${cls.targetScore}+` : ""}
              {cls.schedule ? ` · ${cls.schedule}` : ""}
            </p>
          </div>
          {canManage && cls.status !== "ARCHIVED" && (
            <form action={archiveClassAction}>
              <input type="hidden" name="classId" value={cls.id} />
              <Button type="submit" size="sm" variant="outline">
                Lưu trữ lớp
              </Button>
            </form>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Giáo viên</h2>
          <div className="flex flex-col gap-2">
            {cls.teachers.length === 0 && (
              <p className="text-sm text-muted-foreground">Chưa có giáo viên nào được phân công.</p>
            )}
            {cls.teachers.map((t) => (
              <div key={t.teacherId} className="flex items-center justify-between rounded-xl border bg-card p-3">
                <div>
                  <p className="text-sm font-medium">{t.teacher.name}</p>
                  <p className="text-xs text-muted-foreground">{t.teacher.email}</p>
                </div>
                {canManage && (
                  <form action={removeTeacherAction}>
                    <input type="hidden" name="classId" value={cls.id} />
                    <input type="hidden" name="teacherId" value={t.teacherId} />
                    <Button type="submit" size="sm" variant="destructive">
                      Bỏ
                    </Button>
                  </form>
                )}
              </div>
            ))}
          </div>
          {canManage && <AssignTeacherForm classId={cls.id} teachers={availableTeachers} />}
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Học viên ({activeEnrollments.length})</h2>
          <div className="flex flex-col gap-2">
            {activeEnrollments.length === 0 && (
              <p className="text-sm text-muted-foreground">Chưa có học viên nào trong lớp.</p>
            )}
            {activeEnrollments.map((e) => (
              <div key={e.studentId} className="flex items-center justify-between rounded-xl border bg-card p-3">
                <div>
                  <p className="text-sm font-medium">{e.student.name}</p>
                  <p className="text-xs text-muted-foreground">{e.student.email}</p>
                </div>
                {canManage && (
                  <form action={removeEnrollmentAction}>
                    <input type="hidden" name="classId" value={cls.id} />
                    <input type="hidden" name="studentId" value={e.studentId} />
                    <Button type="submit" size="sm" variant="destructive">
                      Bỏ
                    </Button>
                  </form>
                )}
              </div>
            ))}
          </div>
          {canManage && <EnrollStudentForm classId={cls.id} students={availableStudents} />}
        </div>
      </div>
    </AppShell>
  );
}
