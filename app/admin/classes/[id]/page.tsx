import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { can, getScopedClassIdsFor, requireAdminPage } from "@/lib/admin/permissions";
import { formatVnDate, getStudentStatus, PACKAGE_LABEL } from "@/lib/admin/student-status";
import {
  getClassDetail,
  removeTeacherAction,
  removeEnrollmentAction,
  archiveClassAction,
  updateClassStatusAction,
} from "@/lib/actions/classes";
import { AdminContent, AdminPageHeader, EmptyState, Kpi, PackageTag, Panel, PersonCell, Pill } from "@/components/admin/admin-ui";
import { AssignTeacherForm } from "@/components/admin/assign-teacher-form";
import { EnrollStudentForm } from "@/components/admin/enroll-student-form";
import { ConfirmSubmitButton, SubmitButton } from "@/components/admin/classes/form-buttons";
import { ClassSessionsForm } from "@/components/admin/classes/class-sessions-form";
import { LabeledProgress } from "@/components/admin/classes/labeled-progress";
import { ClassAssignmentsPanel, type ClassAssignmentRow } from "@/components/admin/classes/class-assignments-panel";
import {
  CLASS_STATUS_META,
  isOpenClassStatus,
  PRACTICE_WINDOW_DAYS,
  practiceWindowStart,
} from "@/components/admin/classes/class-status";
import type { ClassStatus } from "@/lib/generated/prisma/enums";

const STATUS_OPTIONS: ClassStatus[] = ["UPCOMING", "ACTIVE", "FINISHED", "ARCHIVED"];

/** Số bài tập tối đa hiện ở panel "Bài tập" (bài đang mở lên trước, rồi mới nhất). */
const ASSIGNMENT_LIST_LIMIT = 30;

/** Chỉ hiện link học online khi là http(s) — tránh chèn javascript: vào href. */
function safeHttpUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export default async function AdminClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAdminPage("viewClasses");

  let cls: Awaited<ReturnType<typeof getClassDetail>>;
  try {
    cls = await getClassDetail(id);
  } catch {
    // TEACHER cố truy cập lớp không thuộc mình — không cho xem, không lộ dữ liệu lớp.
    redirect("/admin/classes");
  }
  if (!cls) notFound();

  const canManage = can(user, "manageClasses");
  const canPlace = can(user, "placeStudents");
  const canSeePlans = can(user, "viewStudents");
  // Phạm vi giao bài có thể hẹp hơn phạm vi xem lớp (tài khoản vừa Vận hành vừa Giáo viên).
  const assignScope = can(user, "manageAssignments") ? await getScopedClassIdsFor(user, "manageAssignments") : [];
  const canAssign = assignScope === null || assignScope.includes(cls.id);
  const isOpen = isOpenClassStatus(cls.status);

  const activeEnrollments = cls.enrollments.filter((e) => e.status === "ACTIVE");
  const inactiveCount = cls.enrollments.length - activeEnrollments.length;
  const assignedTeacherIds = cls.teachers.map((t) => t.teacherId);
  const enrolledStudentIds = activeEnrollments.map((e) => e.studentId);

  const [practice, availableTeachers, availableStudents, assignments, assignmentStatusCounts] = await Promise.all([
    enrolledStudentIds.length > 0
      ? prisma.practiceAttempt.groupBy({
          by: ["userId"],
          where: { userId: { in: enrolledStudentIds }, createdAt: { gte: practiceWindowStart() } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    canManage
      ? prisma.user.findMany({
          where: { roles: { has: "TEACHER" }, status: "ACTIVE", id: { notIn: assignedTeacherIds } },
          orderBy: { name: "asc" },
          select: { id: true, name: true, email: true },
        })
      : Promise.resolve([]),
    // Chỉ học viên cùng gói với lớp (quy tắc xếp lớp) và chưa có trong lớp.
    canPlace && isOpen
      ? prisma.user.findMany({
          where: { roles: { has: "STUDENT" }, examPackage: cls.examType, id: { notIn: enrolledStudentIds } },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            classEnrollments: { where: { status: "ACTIVE" }, select: { class: { select: { code: true } } } },
          },
        })
      : Promise.resolve([]),
    // Enum sắp theo thứ tự khai báo: OPEN → CLOSED → ARCHIVED.
    prisma.assignment.findMany({
      where: { classId: cls.id },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: ASSIGNMENT_LIST_LIMIT,
      select: {
        id: true,
        title: true,
        kind: true,
        status: true,
        dueAt: true,
        _count: { select: { recipients: true } },
      },
    }),
    prisma.assignment.groupBy({ by: ["status"], where: { classId: cls.id }, _count: { _all: true } }),
  ]);

  const completedRows =
    assignments.length > 0
      ? await prisma.assignmentRecipient.groupBy({
          by: ["assignmentId"],
          where: { assignmentId: { in: assignments.map((a) => a.id) }, completedAt: { not: null } },
          _count: { _all: true },
        })
      : [];
  const completedByAssignment = new Map(completedRows.map((r) => [r.assignmentId, r._count._all]));
  const assignmentRows: ClassAssignmentRow[] = assignments.map((a) => ({
    id: a.id,
    title: a.title,
    kind: a.kind,
    status: a.status,
    dueAt: a.dueAt,
    recipients: a._count.recipients,
    completed: completedByAssignment.get(a.id) ?? 0,
  }));
  const assignmentTotal = assignmentStatusCounts.reduce((sum, r) => sum + r._count._all, 0);
  const assignmentOpen = assignmentStatusCounts.find((r) => r.status === "OPEN")?._count._all ?? 0;

  const attemptsByStudent = new Map(practice.map((p) => [p.userId, p._count._all]));
  const totalAttempts = practice.reduce((sum, p) => sum + p._count._all, 0);
  const practicingCount = enrolledStudentIds.filter((sid) => (attemptsByStudent.get(sid) ?? 0) > 0).length;
  // Chỉ giáo viên vai trò MAIN mới là "giáo viên chính" — lớp chỉ có trợ giảng thì không có GV chính.
  const mainTeacher = cls.teachers.find((t) => t.role === "MAIN");
  const status = CLASS_STATUS_META[cls.status];
  const meetingUrl = safeHttpUrl(cls.meetingUrl);
  const packageLabel = PACKAGE_LABEL[cls.examType] ?? cls.examType;

  const subParts = [cls.code, packageLabel];
  if (cls.targetScore) subParts.push(`Mục tiêu ${cls.targetScore}+`);
  if (cls.schedule) subParts.push(cls.schedule);

  return (
    <>
      <AdminPageHeader title={cls.name} sub={subParts.join(" · ")} />
      <AdminContent>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/classes" className="adm-btn adm-btn-ghost adm-btn-sm -ml-2">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Lớp học
          </Link>
          <Pill tone={status.tone}>{status.label}</Pill>
          <PackageTag pkg={cls.examType} />
          {!canManage && !canPlace && (
            <span className="text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
              Chế độ xem
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi
            label="Sĩ số"
            value={activeEnrollments.length}
            hint={inactiveCount > 0 ? `${inactiveCount} đã rời / tạm dừng` : "Học viên đang học"}
          />
          <Kpi
            label="Giáo viên"
            value={cls.teachers.length}
            hint={
              mainTeacher
                ? `Chính: ${mainTeacher.teacher.name}`
                : cls.teachers.length > 0
                  ? "Chưa có GV chính"
                  : "Chưa phân công"
            }
            alert={cls.teachers.length === 0}
          />
          <Kpi
            label="Khai giảng"
            value={
              // Ngày dài hơn con số → cỡ chữ nhỏ hơn trên màn hẹp để không tràn ô KPI.
              <span className="text-[20px] sm:text-[28px]">{cls.startDate ? formatVnDate(cls.startDate) : "—"}</span>
            }
            hint={cls.endDate ? `Kết thúc ${formatVnDate(cls.endDate)}` : "Chưa có ngày kết thúc"}
          />
          <Kpi
            label={`Luyện đề ${PRACTICE_WINDOW_DAYS} ngày`}
            value={totalAttempts.toLocaleString("vi-VN")}
            hint={`${practicingCount}/${activeEnrollments.length} học viên có luyện`}
          />
        </div>

        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-5">
            {/* Học viên */}
            <Panel
              title="Học viên"
              meta={`${activeEnrollments.length} đang học`}
              bodyClassName="flex flex-col"
            >
              {activeEnrollments.length === 0 ? (
                <EmptyState>Chưa có học viên nào trong lớp.</EmptyState>
              ) : (
                <div className="adm-tw">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th scope="col">Học viên</th>
                        {canSeePlans && <th scope="col">Hạn gói</th>}
                        <th scope="col">Vào lớp</th>
                        <th scope="col">Luyện đề {PRACTICE_WINDOW_DAYS} ngày</th>
                        {canPlace && (
                          <th scope="col">
                            <span className="sr-only">Thao tác</span>
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {activeEnrollments.map((e) => {
                        const plan = getStudentStatus(e.student.expiresAt, e.student.reservedUntil);
                        const attempts = attemptsByStudent.get(e.studentId) ?? 0;
                        return (
                          <tr key={e.studentId}>
                            <td className="min-w-[220px]">
                              <PersonCell
                                name={e.student.name}
                                email={e.student.email}
                                extra={
                                  <>
                                    {e.student.examPackage !== cls.examType && <Pill tone="warn">Khác gói</Pill>}
                                    {e.student.status === "INACTIVE" && <Pill tone="mute">Đã khoá</Pill>}
                                  </>
                                }
                              />
                            </td>
                            {canSeePlans && (
                              <td className="whitespace-nowrap">
                                <div className="flex flex-col items-start gap-1">
                                  <span className="adm-num">{formatVnDate(e.student.expiresAt)}</span>
                                  <span className={`adm-pill ${plan.pill}`}>{plan.label}</span>
                                </div>
                              </td>
                            )}
                            <td className="adm-num whitespace-nowrap">{formatVnDate(e.joinedAt)}</td>
                            <td className="adm-num whitespace-nowrap">
                              {attempts > 0 ? (
                                `${attempts.toLocaleString("vi-VN")} lượt`
                              ) : (
                                <span style={{ color: "var(--adm-brand-text)" }}>Chưa luyện</span>
                              )}
                            </td>
                            {canPlace && (
                              <td className="text-right whitespace-nowrap">
                                <form action={removeEnrollmentAction}>
                                  <input type="hidden" name="classId" value={cls.id} />
                                  <input type="hidden" name="studentId" value={e.studentId} />
                                  <ConfirmSubmitButton
                                    label="Bỏ khỏi lớp"
                                    confirmLabel="Xác nhận bỏ"
                                    srContext={e.student.name}
                                  />
                                </form>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {canPlace && (
                <div className="flex flex-col gap-2 border-t px-4 py-4" style={{ borderColor: "var(--adm-line)" }}>
                  <h3 className="text-[13.5px] font-semibold">Thêm học viên</h3>
                  {isOpen ? (
                    <EnrollStudentForm
                      classId={cls.id}
                      packageLabel={packageLabel}
                      students={availableStudents.map((s) => ({
                        id: s.id,
                        name: s.name,
                        email: s.email,
                        locked: s.status === "INACTIVE",
                        currentClasses: s.classEnrollments.map((ce) => ce.class.code),
                      }))}
                    />
                  ) : (
                    <p className="text-[13px]" style={{ color: "var(--adm-ink-3)" }}>
                      Lớp đã kết thúc hoặc đã lưu trữ — không xếp thêm học viên. Đổi trạng thái lớp nếu cần mở lại.
                    </p>
                  )}
                  <p className="text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
                    Mỗi học viên chỉ học 1 lớp: thêm học viên đang học lớp khác sẽ tự chuyển họ khỏi lớp cũ.
                  </p>
                  <p className="text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
                    Lưu ý: học viên không còn lớp nào đang học sẽ bị khoá quyền luyện đề cho tới khi được xếp lớp.
                  </p>
                </div>
              )}
            </Panel>

            {/* Bài tập */}
            <ClassAssignmentsPanel
              classId={cls.id}
              classCode={cls.code}
              rows={assignmentRows}
              totalCount={assignmentTotal}
              openCount={assignmentOpen}
              linkToAssignments={canAssign}
              canCreate={canAssign && isOpen}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-5">
            {/* Thông tin lớp */}
            <Panel title="Thông tin lớp">
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 px-4 py-4 text-[13.5px]">
                <dt style={{ color: "var(--adm-ink-3)" }}>Mã lớp</dt>
                <dd className="adm-num font-semibold break-words">{cls.code}</dd>
                <dt style={{ color: "var(--adm-ink-3)" }}>Gói thi</dt>
                <dd>
                  <PackageTag pkg={cls.examType} />
                </dd>
                <dt style={{ color: "var(--adm-ink-3)" }}>Mục tiêu</dt>
                <dd className="adm-num">{cls.targetScore ? `${cls.targetScore}+` : "—"}</dd>
                <dt style={{ color: "var(--adm-ink-3)" }}>Lịch học</dt>
                <dd className="break-words">{cls.schedule || "—"}</dd>
                <dt style={{ color: "var(--adm-ink-3)" }}>Khai giảng</dt>
                <dd className="adm-num">{cls.startDate ? formatVnDate(cls.startDate) : "—"}</dd>
                <dt style={{ color: "var(--adm-ink-3)" }}>Kết thúc</dt>
                <dd className="adm-num">{cls.endDate ? formatVnDate(cls.endDate) : "—"}</dd>
                <dt style={{ color: "var(--adm-ink-3)" }}>Buổi đã học</dt>
                <dd className="min-w-0">
                  {cls.sessionsTotal ? (
                    <div className="flex flex-col gap-1.5">
                      <span className="adm-num">
                        {cls.sessionsDone}/{cls.sessionsTotal}
                      </span>
                      <div className="flex">
                        <LabeledProgress
                          value={cls.sessionsDone}
                          max={cls.sessionsTotal}
                          label={`Buổi đã học lớp ${cls.code}`}
                          valueText={`${cls.sessionsDone} trên ${cls.sessionsTotal} buổi`}
                        />
                      </div>
                    </div>
                  ) : (
                    <span style={{ color: "var(--adm-ink-3)" }}>
                      Chưa nhập số buổi{cls.sessionsDone > 0 ? ` (đã học ${cls.sessionsDone})` : ""}
                    </span>
                  )}
                </dd>
                <dt style={{ color: "var(--adm-ink-3)" }}>Link học</dt>
                <dd className="min-w-0 truncate">
                  {meetingUrl ? (
                    <a href={meetingUrl} target="_blank" rel="noopener noreferrer" className="underline">
                      Mở link lớp học
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
                <dt style={{ color: "var(--adm-ink-3)" }}>Trạng thái</dt>
                <dd>
                  <Pill tone={status.tone}>{status.label}</Pill>
                </dd>
              </dl>
              {canManage && (
                <div className="flex flex-col gap-2 border-t px-4 py-4" style={{ borderColor: "var(--adm-line)" }}>
                  <h3 className="text-[13.5px] font-semibold">Số buổi học</h3>
                  <ClassSessionsForm
                    classId={cls.id}
                    sessionsDone={cls.sessionsDone}
                    sessionsTotal={cls.sessionsTotal}
                  />
                </div>
              )}
              {canManage && (
                <div className="flex flex-wrap items-end gap-2 border-t px-4 py-4" style={{ borderColor: "var(--adm-line)" }}>
                  <form action={updateClassStatusAction} className="flex min-w-0 flex-[1_1_200px] items-end gap-2">
                    <input type="hidden" name="classId" value={cls.id} />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <label
                        htmlFor="class-status"
                        className="text-[12.5px] font-semibold"
                        style={{ color: "var(--adm-ink-2)" }}
                      >
                        Đổi trạng thái
                      </label>
                      <select id="class-status" name="status" defaultValue={cls.status} className="adm-input w-full">
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {CLASS_STATUS_META[s].label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <SubmitButton className="adm-btn-sm">Lưu</SubmitButton>
                  </form>
                  {cls.status !== "ARCHIVED" && (
                    <form action={archiveClassAction}>
                      <input type="hidden" name="classId" value={cls.id} />
                      <ConfirmSubmitButton label="Lưu trữ lớp" confirmLabel="Xác nhận lưu trữ" />
                    </form>
                  )}
                </div>
              )}
            </Panel>

            {/* Giáo viên */}
            <Panel title="Giáo viên" meta={`${cls.teachers.length} người`}>
              {cls.teachers.length === 0 ? (
                <EmptyState>Chưa có giáo viên nào được phân công.</EmptyState>
              ) : (
                <div className="adm-tw">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th scope="col">Giáo viên</th>
                        <th scope="col">Vai trò</th>
                        {canManage && (
                          <th scope="col">
                            <span className="sr-only">Thao tác</span>
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {cls.teachers.map((t) => (
                        <tr key={t.teacherId}>
                          <td className="min-w-[180px]">
                            <PersonCell name={t.teacher.name} email={t.teacher.email} />
                          </td>
                          <td className="whitespace-nowrap">
                            <Pill tone={t.role === "MAIN" ? "plum" : "mute"}>
                              {t.role === "MAIN" ? "Giáo viên chính" : "Trợ giảng"}
                            </Pill>
                          </td>
                          {canManage && (
                            <td className="text-right whitespace-nowrap">
                              <form action={removeTeacherAction}>
                                <input type="hidden" name="classId" value={cls.id} />
                                <input type="hidden" name="teacherId" value={t.teacherId} />
                                <ConfirmSubmitButton label="Bỏ" confirmLabel="Xác nhận bỏ" srContext={t.teacher.name} />
                              </form>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {canManage && (
                <div className="flex flex-col gap-2 border-t px-4 py-4" style={{ borderColor: "var(--adm-line)" }}>
                  <h3 className="text-[13.5px] font-semibold">Phân công giáo viên</h3>
                  <AssignTeacherForm classId={cls.id} teachers={availableTeachers} />
                </div>
              )}
            </Panel>
          </div>
        </div>
      </AdminContent>
    </>
  );
}
