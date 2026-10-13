import { prisma } from "@/lib/prisma";
import type { ClassStatus, ClassTeacherRole, UserStatus } from "@/lib/generated/prisma/enums";

/** Truy vấn cho trang Giáo viên (HANDOFF mục 4.7). Module chỉ chạy ở server —
 * KHÔNG phải server action; trang gọi nó PHẢI kiểm tra requireAdminPage("viewTeachers")
 * trước. */

/** Lớp còn hoạt động — dùng để tính khối lượng hiện tại của giáo viên. */
const OPEN_CLASS_STATUSES: ClassStatus[] = ["UPCOMING", "ACTIVE"];

export interface TeacherClassRef {
  id: string;
  code: string;
  name: string;
  status: ClassStatus;
  role: ClassTeacherRole;
}

export interface TeacherRosterRow {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  /** Chuyên môn (TeacherProfile.specialty), null = chưa nhập. */
  specialty: string | null;
  /** Lớp đang học / sắp khai giảng, giáo viên chính trước. */
  openClasses: TeacherClassRef[];
  /** Số lớp đã kết thúc hoặc lưu trữ (chỉ để tham khảo). */
  closedClassCount: number;
  /** Số học viên (không trùng) đang học trong các lớp còn hoạt động. */
  studentCount: number;
  /** Bài chờ chấm (PracticeAttempt PENDING) thuộc bài tập của mọi lớp giáo viên
   * phụ trách — chính hoặc trợ giảng, kể cả lớp đã kết thúc. */
  pendingGrading: number;
}

export interface TeacherRoster {
  rows: TeacherRosterRow[];
  activeTeacherCount: number;
  /** Học viên không trùng đang được ít nhất 1 giáo viên dạy. */
  taughtStudentCount: number;
  /** Lớp còn hoạt động nhưng chưa có giáo viên nào. */
  openClassesWithoutTeacher: number;
}

/** Số bài chờ chấm theo lớp: groupBy theo bài tập rồi quy về lớp của bài tập. */
async function countPendingGradingByClass(): Promise<Map<string, number>> {
  const byAssignment = await prisma.practiceAttempt.groupBy({
    by: ["assignmentId"],
    where: { reviewStatus: "PENDING", assignmentId: { not: null } },
    _count: { _all: true },
  });
  const assignmentIds = byAssignment.flatMap((r) => (r.assignmentId ? [r.assignmentId] : []));
  if (assignmentIds.length === 0) return new Map();
  const assignments = await prisma.assignment.findMany({
    where: { id: { in: assignmentIds } },
    select: { id: true, classId: true },
  });
  const classOf = new Map(assignments.map((a) => [a.id, a.classId]));
  const byClass = new Map<string, number>();
  for (const r of byAssignment) {
    const classId = r.assignmentId ? classOf.get(r.assignmentId) : undefined;
    if (!classId) continue;
    byClass.set(classId, (byClass.get(classId) ?? 0) + r._count._all);
  }
  return byClass;
}

export async function getTeacherRoster(): Promise<TeacherRoster> {
  const [teachers, openClassesWithoutTeacher, pendingByClass] = await Promise.all([
    prisma.user.findMany({
      where: { roles: { has: "TEACHER" } },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        teacherProfile: { select: { specialty: true } },
        teachingClasses: {
          orderBy: [{ role: "asc" }, { createdAt: "asc" }],
          select: {
            role: true,
            class: {
              select: {
                id: true,
                code: true,
                name: true,
                status: true,
                enrollments: { where: { status: "ACTIVE" }, select: { studentId: true } },
              },
            },
          },
        },
      },
    }),
    prisma.class.count({ where: { status: { in: OPEN_CLASS_STATUSES }, teachers: { none: {} } } }),
    countPendingGradingByClass(),
  ]);

  const allTaught = new Set<string>();
  const rows: TeacherRosterRow[] = teachers.map((t) => {
    const open = t.teachingClasses.filter((tc) => OPEN_CLASS_STATUSES.includes(tc.class.status));
    const students = new Set<string>();
    for (const tc of open) {
      for (const e of tc.class.enrollments) {
        students.add(e.studentId);
        allTaught.add(e.studentId);
      }
    }
    return {
      id: t.id,
      name: t.name,
      email: t.email,
      status: t.status,
      specialty: t.teacherProfile?.specialty ?? null,
      openClasses: open.map((tc) => ({
        id: tc.class.id,
        code: tc.class.code,
        name: tc.class.name,
        status: tc.class.status,
        role: tc.role,
      })),
      closedClassCount: t.teachingClasses.length - open.length,
      studentCount: students.size,
      // Mỗi lớp chỉ xuất hiện 1 lần với 1 giáo viên (unique classId+teacherId) → cộng không trùng.
      pendingGrading: t.teachingClasses.reduce((sum, tc) => sum + (pendingByClass.get(tc.class.id) ?? 0), 0),
    };
  });

  return {
    rows,
    activeTeacherCount: rows.filter((r) => r.status === "ACTIVE").length,
    taughtStudentCount: allTaught.size,
    openClassesWithoutTeacher,
  };
}
