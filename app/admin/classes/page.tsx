import type { ReactNode } from "react";
import Form from "next/form";
import Link from "next/link";
import { Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { can, getScopedClassIds, getScopedClassIdsFor, isTeacherOnly, requireAdminPage } from "@/lib/admin/permissions";
import { formatVnDate } from "@/lib/admin/student-status";
import { AdminContent, AdminPageHeader, EmptyState, Panel, SegLinks } from "@/components/admin/admin-ui";
import { ClassCard, type ClassCardData } from "@/components/admin/classes/class-card";
import { CreateClassSheet } from "@/components/admin/classes/create-class-sheet";
import {
  CLASS_FILTERS,
  CLASS_STATUS_ORDER,
  isOpenClassStatus,
  PRACTICE_WINDOW_DAYS,
  practiceWindowStart,
  type ClassFilterKey,
} from "@/components/admin/classes/class-status";

/** Lớp học (HANDOFF mục 4.4). Admin/CSKH/Trưởng học thuật xem mọi lớp; giáo
 * viên chỉ thấy lớp mình được phân công (giới hạn ngay trong câu truy vấn). */
export default async function AdminClassesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAdminPage("viewClasses");
  const sp = await searchParams;
  // Khoá lặp lại trong URL (?q=a&q=b) cho ra mảng — chỉ nhận chuỗi.
  const statusParam = typeof sp.status === "string" ? sp.status : undefined;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const scopedIds = await getScopedClassIds(user);
  const classes = await prisma.class.findMany({
    where: scopedIds ? { id: { in: scopedIds } } : {},
    select: {
      id: true,
      code: true,
      name: true,
      examType: true,
      schedule: true,
      startDate: true,
      status: true,
      createdAt: true,
      teachers: {
        select: { role: true, teacher: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
      sessionsDone: true,
      sessionsTotal: true,
      enrollments: {
        where: { status: "ACTIVE" },
        select: { student: { select: { id: true, name: true } } },
        orderBy: { joinedAt: "asc" },
      },
      _count: { select: { assignments: { where: { status: "OPEN" } } } },
    },
  });

  // Đếm theo tab trên toàn bộ lớp người dùng được xem (trước khi tìm kiếm).
  const counts = Object.fromEntries(
    CLASS_FILTERS.map((f) => [f.key, classes.filter((c) => f.match(c.status)).length])
  ) as Record<ClassFilterKey, number>;

  // Mặc định mở tab "Đang học"; nếu chưa có lớp đang học thì hiện tất cả.
  const requested = CLASS_FILTERS.find((f) => f.key === statusParam);
  const filter = requested ?? (counts.active > 0 ? CLASS_FILTERS[0] : CLASS_FILTERS[3]);

  const needle = q.toLocaleLowerCase("vi");
  const visible = classes
    .filter((c) => filter.match(c.status))
    .filter((c) => !needle || c.name.toLocaleLowerCase("vi").includes(needle) || c.code.toLocaleLowerCase("vi").includes(needle))
    .sort(
      (a, b) =>
        CLASS_STATUS_ORDER[a.status] - CLASS_STATUS_ORDER[b.status] ||
        (b.startDate?.getTime() ?? 0) - (a.startDate?.getTime() ?? 0) ||
        b.createdAt.getTime() - a.createdAt.getTime()
    );

  // Lượt luyện đề 7 ngày gần nhất của học viên trong các lớp đang hiển thị.
  const studentIds = [...new Set(visible.flatMap((c) => c.enrollments.map((e) => e.student.id)))];
  const practice =
    studentIds.length > 0
      ? await prisma.practiceAttempt.groupBy({
          by: ["userId"],
          where: { userId: { in: studentIds }, createdAt: { gte: practiceWindowStart() } },
          _count: { _all: true },
        })
      : [];
  const attemptsByStudent = new Map(practice.map((p) => [p.userId, p._count._all]));

  // Danh sách lớp đã giới hạn theo phạm vi (giáo viên chỉ thấy lớp mình), nên mọi
  // lớp đang hiển thị đều "thuộc phạm vi" — chỉ cần quyền giao bài và lớp còn hoạt động.
  const canAssignAny = can(user, "manageAssignments");
  // Phạm vi GIAO BÀI có thể hẹp hơn phạm vi XEM lớp (vd tài khoản vừa Vận hành vừa
  // Giáo viên: xem mọi lớp nhưng chỉ giao bài cho lớp mình dạy).
  const assignScope = canAssignAny ? await getScopedClassIdsFor(user, "manageAssignments") : [];
  const scopeSet = assignScope ? new Set(assignScope) : null;

  const cards: ClassCardData[] = visible.map((c) => {
    // Chỉ GV vai trò MAIN hiện ở ô "Giáo viên chính" (lớp chỉ có trợ giảng → "Chưa có GV chính").
    const main = c.teachers.find((t) => t.role === "MAIN");
    const students = c.enrollments.map((e) => e.student);
    const attempts = students.map((s) => attemptsByStudent.get(s.id) ?? 0);
    return {
      id: c.id,
      code: c.code,
      name: c.name,
      examType: c.examType,
      schedule: c.schedule,
      startDateLabel: c.startDate ? formatVnDate(c.startDate) : "—",
      status: c.status,
      mainTeacher: main?.teacher.name ?? null,
      otherTeachers: c.teachers.length - (main ? 1 : 0),
      students,
      practiceAttempts: attempts.reduce((sum, n) => sum + n, 0),
      practicingStudents: attempts.filter((n) => n > 0).length,
      sessionsDone: c.sessionsDone,
      sessionsTotal: c.sessionsTotal,
      openAssignments: c._count.assignments,
      canAssign: canAssignAny && isOpenClassStatus(c.status) && (!scopeSet || scopeSet.has(c.id)),
    };
  });

  const canManage = can(user, "manageClasses");
  const showStudentListLink = can(user, "viewStudents");
  const teacherOnly = isTeacherOnly(user);

  const hrefFor = (key: ClassFilterKey) => {
    const params = new URLSearchParams({ status: key });
    if (q) params.set("q", q);
    return `/admin/classes?${params.toString()}`;
  };

  const sub = teacherOnly
    ? `${classes.length} lớp bạn được phân công`
    : `${classes.length} lớp · sĩ số, giáo viên, buổi học, bài đang mở, luyện đề ${PRACTICE_WINDOW_DAYS} ngày`;

  let emptyMessage: ReactNode = "Không có lớp nào ở trạng thái này.";
  if (classes.length === 0) {
    emptyMessage = teacherOnly
      ? "Bạn chưa được phân công lớp nào."
      : canManage
        ? "Chưa có lớp học nào — bấm “Tạo lớp” để bắt đầu."
        : "Chưa có lớp học nào.";
  } else if (q) {
    emptyMessage = (
      <>
        Không có lớp nào khớp “{q}”.{" "}
        <Link href={`/admin/classes?status=${filter.key}`} className="underline">
          Xoá tìm kiếm
        </Link>
      </>
    );
  }

  return (
    <>
      <AdminPageHeader title="Lớp học" sub={sub} actions={canManage ? <CreateClassSheet /> : undefined} />
      <AdminContent>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SegLinks
            items={CLASS_FILTERS.map((f) => ({
              label: `${f.label} · ${counts[f.key]}`,
              href: hrefFor(f.key),
              active: f.key === filter.key,
            }))}
          />
          <Form action="/admin/classes" className="flex w-full min-w-0 items-center gap-2 sm:w-auto" role="search">
            <input type="hidden" name="status" value={filter.key} />
            <label htmlFor="class-search" className="sr-only">
              Tìm lớp theo tên hoặc mã lớp
            </label>
            <input
              id="class-search"
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Tìm theo tên hoặc mã lớp"
              className="adm-input min-w-0 flex-1 sm:w-64"
            />
            <button type="submit" className="adm-btn adm-btn-sm" aria-label="Tìm lớp">
              <Search className="size-4" aria-hidden="true" />
            </button>
          </Form>
        </div>

        {cards.length === 0 ? (
          <Panel>
            <EmptyState>{emptyMessage}</EmptyState>
          </Panel>
        ) : (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 min-[1100px]:grid-cols-3">
            {cards.map((c) => (
              <ClassCard key={c.id} data={c} showStudentListLink={showStudentListLink} />
            ))}
          </div>
        )}
      </AdminContent>
    </>
  );
}
