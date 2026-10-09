import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { CreateClassForm } from "@/components/admin/create-class-form";
import { getClassesForCurrentUser } from "@/lib/actions/classes";
import { hasAnyRole } from "@/lib/auth-helpers";

const CLASS_STATUS_LABELS: Record<string, string> = {
  UPCOMING: "Sắp khai giảng",
  ACTIVE: "Đang học",
  FINISHED: "Đã kết thúc",
  ARCHIVED: "Lưu trữ",
};

export default async function AdminClassesPage() {
  const session = await auth();
  if (!session?.user || !hasAnyRole(session.user, ["ADMIN", "OPS", "ACADEMIC_LEAD", "TEACHER"])) {
    redirect("/");
  }

  const classes = await getClassesForCurrentUser();
  const canCreate = hasAnyRole(session.user, ["ADMIN", "OPS", "ACADEMIC_LEAD"]);

  return (
    <AppShell>
      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-5 py-6 sm:px-10">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold">Lớp học</h1>
            <p className="text-sm text-muted-foreground">
              {canCreate ? "Toàn bộ lớp học trong hệ thống." : "Các lớp bạn đang được phân công giảng dạy."}
            </p>
          </div>
          {canCreate && (
            <Link href="/admin/users" className="rounded-lg border px-3 py-1.5 text-sm font-medium text-primary hover:bg-muted">
              Người dùng →
            </Link>
          )}
        </div>

        {canCreate && <CreateClassForm />}

        <div className="flex flex-col gap-3">
          {classes.length === 0 && (
            <p className="rounded-xl border bg-card p-4 text-center text-sm text-muted-foreground">
              Chưa có lớp học nào.
            </p>
          )}
          {classes.map((c) => (
            <Link
              key={c.id}
              href={`/admin/classes/${c.id}`}
              className="flex flex-col gap-2 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.code} · {c.examType === "academic" ? "PTE Academic" : "PTE Core"}
                  </p>
                </div>
                <span className="rounded-full border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {CLASS_STATUS_LABELS[c.status] ?? c.status}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>
                  Giáo viên: {c.teachers.length > 0 ? c.teachers.map((t) => t.teacher.name).join(", ") : "Chưa có"}
                </span>
                <span>Học viên: {c._count.enrollments}</span>
                {c.schedule && <span>Lịch: {c.schedule}</span>}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
