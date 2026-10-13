import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { ExamPackage } from "@/lib/generated/prisma/enums";
import { QUESTION_TYPES } from "@/lib/question-types";
import { expiringStudentsWhere, pendingGradingWhere, startOfVnDay } from "@/lib/admin/nav-queries";

/** Truy vấn cho trang Tổng quan Admin (HANDOFF.md mục 4.1).
 * Module server thường (không phải "use server") — chỉ gọi từ trang đã gọi
 * requireAdminPage("viewOverview") và tự quyết định phần nào được hiện theo quyền.
 * Tham số classIds lấy từ getScopedClassIdsFor(user, <quyền của phần đó>): null =
 * mọi lớp; mảng = chỉ các lớp đó (lớp được phân công) — giới hạn ngay trong câu
 * truy vấn, không lọc ở giao diện. */

const OPEN_CLASS_STATUSES = ["ACTIVE", "UPCOMING"] as const;

// Điều kiện dùng chung với badge menu nằm ở nav-queries; xuất lại để nơi khác
// import từ đây vẫn dùng đúng một định nghĩa.
export { expiringStudentsWhere };

/** Tỷ lệ phần trăm làm tròn; null khi mẫu số bằng 0 (hiển thị "—"). */
export function percentOf(part: number, whole: number): number | null {
  return whole > 0 ? Math.round((100 * part) / whole) : null;
}

/* ---------- KPI ---------- */

/** Học viên đang học = tài khoản học viên (chưa bị khoá) có ít nhất 1 ghi danh
 * ACTIVE (trong các lớp classIds nếu có). total = tổng tài khoản học viên — chỉ
 * tính khi không giới hạn lớp (giáo viên không cần con số toàn trung tâm). */
export async function getStudyingStudentStats(classIds: string[] | null): Promise<{ studying: number; total: number | null }> {
  const [studying, total] = await Promise.all([
    prisma.user.count({
      where: {
        roles: { has: "STUDENT" },
        status: "ACTIVE",
        classEnrollments: { some: { status: "ACTIVE", ...(classIds ? { classId: { in: classIds } } : {}) } },
      },
    }),
    classIds ? Promise.resolve(null) : prisma.user.count({ where: { roles: { has: "STUDENT" }, status: "ACTIVE" } }),
  ]);
  return { studying, total };
}

/** Số lớp đang học / sắp khai giảng. */
export async function getOpenClassCounts(classIds: string[] | null): Promise<{ active: number; upcoming: number }> {
  const rows = await prisma.class.groupBy({
    by: ["status"],
    where: { status: { in: [...OPEN_CLASS_STATUSES] }, ...(classIds ? { id: { in: classIds } } : {}) },
    _count: { _all: true },
  });
  const countOf = (s: string) => rows.find((r) => r.status === s)?._count._all ?? 0;
  return { active: countOf("ACTIVE"), upcoming: countOf("UPCOMING") };
}

/** Số học viên hết hạn / sắp hết hạn, tách 2 nhóm (đã hết hạn = trước 0h hôm nay giờ VN).
 * Cùng điều kiện với badge menu (countExpiringStudents). */
export async function getExpiringStudentCounts(
  now: Date = new Date()
): Promise<{ expired: number; soon: number; total: number }> {
  const where = expiringStudentsWhere(now);
  const [total, expired] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.count({ where: { AND: [where, { expiresAt: { lt: startOfVnDay(now, 0) } }] } }),
  ]);
  return { expired, soon: total - expired, total };
}

export interface WeeklySubmissionStats {
  /** Số bài tập đang mở được tính vào tỷ lệ tuần này. */
  assignments: number;
  /** Tổng lượt phải nộp (học viên được giao, chốt lúc giao bài). */
  recipients: number;
  /** Số lượt đã nộp (completedAt có giá trị). */
  completed: number;
  /** % đã nộp; null khi chưa có lượt phải nộp nào. */
  rate: number | null;
}

/** Thứ Hai 0h → thứ Hai tuần sau 0h (giờ Việt Nam) của tuần chứa `now`. */
export function vnWeekRange(now: Date = new Date()): { start: Date; end: Date } {
  const vnDay = Math.floor((now.getTime() + 7 * 60 * 60 * 1000) / (24 * 60 * 60 * 1000));
  // 01/01/1970 là thứ Năm → (vnDay + 3) % 7 = 0 vào thứ Hai.
  const dow = (vnDay + 3) % 7;
  return { start: startOfVnDay(now, -dow), end: startOfVnDay(now, 7 - dow) };
}

/** KPI "Tỷ lệ nộp bài tuần này": các bài tập đang mở (OPEN) của lớp đang học / sắp
 * khai giảng trong phạm vi, có hạn nộp rơi vào tuần này (thứ Hai–Chủ nhật, giờ VN)
 * hoặc được giao trong tuần này. Lớp đã kết thúc / lưu trữ không tính (khớp panel
 * "Tiến độ lớp"). Tỷ lệ = Σ lượt đã nộp / Σ lượt phải nộp. */
export async function getWeeklySubmissionStats(
  classIds: string[] | null,
  now: Date = new Date()
): Promise<WeeklySubmissionStats> {
  if (classIds && classIds.length === 0) return { assignments: 0, recipients: 0, completed: 0, rate: null };
  const { start, end } = vnWeekRange(now);
  const inWeek = { gte: start, lt: end };
  const where: Prisma.AssignmentWhereInput = {
    status: "OPEN",
    class: { is: { status: { in: [...OPEN_CLASS_STATUSES] } } },
    ...(classIds ? { classId: { in: classIds } } : {}),
    OR: [{ dueAt: inWeek }, { createdAt: inWeek }],
  };
  const [assignments, agg] = await Promise.all([
    prisma.assignment.count({ where }),
    prisma.assignmentRecipient.aggregate({
      where: { assignment: { is: where } },
      // _count theo cột = số dòng có giá trị khác null → số lượt đã nộp.
      _count: { _all: true, completedAt: true },
    }),
  ]);
  const recipients = agg._count._all;
  const completed = agg._count.completedAt;
  return { assignments, recipients, completed, rate: percentOf(completed, recipients) };
}

/* ---------- Panel "Cần xử lý" ---------- */

export interface ExpiringStudentTodo {
  id: string;
  name: string;
  examPackage: ExamPackage;
  expiresAt: Date;
  reservationsLeft: number;
  classCode: string | null;
}

/** Học viên đã hết hạn hoặc còn ≤ 14 ngày, quá hạn lâu nhất / sắp hết hạn nhất
 * lên trước. Cùng điều kiện với getExpiringStudentCounts. */
export async function getExpiringStudentTodos(limit: number, now: Date = new Date()): Promise<ExpiringStudentTodo[]> {
  const rows = await prisma.user.findMany({
    where: expiringStudentsWhere(now),
    orderBy: [{ expiresAt: "asc" }, { id: "asc" }],
    take: limit,
    select: {
      id: true,
      name: true,
      examPackage: true,
      expiresAt: true,
      reservationsLeft: true,
      classEnrollments: {
        where: { status: "ACTIVE" },
        orderBy: { joinedAt: "desc" },
        take: 1,
        select: { class: { select: { code: true } } },
      },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    examPackage: r.examPackage,
    expiresAt: r.expiresAt,
    reservationsLeft: r.reservationsLeft,
    classCode: r.classEnrollments[0]?.class.code ?? null,
  }));
}

export interface PendingGradingTodo {
  attemptId: string;
  studentName: string;
  /** Tên dạng bài (vd. "Write Essay"); mã dạng nếu không tra được. */
  typeName: string;
  classCode: string | null;
  submittedAt: Date;
}

const QUESTION_TYPE_NAME = new Map(QUESTION_TYPES.map((t) => [t.id, t.name]));

/** Bài chờ chấm trong phạm vi lớp, nộp sớm nhất lên trước (cùng điều kiện với
 * countPendingGrading → khớp badge menu và KPI). */
export async function getPendingGradingTodos(classIds: string[] | null, limit: number): Promise<PendingGradingTodo[]> {
  if (classIds && classIds.length === 0) return [];
  const rows = await prisma.practiceAttempt.findMany({
    where: pendingGradingWhere(classIds),
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: limit,
    select: {
      id: true,
      questionTypeId: true,
      createdAt: true,
      user: { select: { name: true } },
      assignment: { select: { class: { select: { code: true } } } },
    },
  });
  return rows.map((r) => ({
    attemptId: r.id,
    studentName: r.user.name,
    typeName: QUESTION_TYPE_NAME.get(r.questionTypeId) ?? r.questionTypeId,
    classCode: r.assignment?.class.code ?? null,
    submittedAt: r.createdAt,
  }));
}

export interface UnplacedEntryTestTodo {
  userId: string;
  name: string;
  score: number | null;
  level: string | null;
  submittedAt: Date | null;
}

/** Người đã nộp test đầu vào nhưng chưa có lớp ACTIVE (điều kiện khớp
 * countUnplacedEntryTests). Mỗi người 1 dòng — lấy lượt nộp gần nhất, người
 * mới nộp lên trước (lead còn "nóng"). */
export async function getUnplacedEntryTestTodos(limit: number): Promise<UnplacedEntryTestTodo[]> {
  const attempts = await prisma.entryTestAttempt.findMany({
    where: {
      status: { in: ["SUBMITTED", "GRADED"] },
      user: { status: "ACTIVE", classEnrollments: { none: { status: "ACTIVE" } } },
    },
    orderBy: [{ submittedAt: { sort: "desc", nulls: "last" } }, { startedAt: "desc" }],
    // Một người có thể nộp nhiều lượt → lấy dư rồi bỏ trùng theo userId.
    take: limit * 4,
    select: {
      userId: true,
      submittedAt: true,
      scoreTotal: true,
      scoreAuto: true,
      level: true,
      user: { select: { name: true } },
    },
  });
  const seen = new Set<string>();
  const result: UnplacedEntryTestTodo[] = [];
  for (const a of attempts) {
    if (seen.has(a.userId)) continue;
    seen.add(a.userId);
    result.push({
      userId: a.userId,
      name: a.user.name,
      score: a.scoreTotal ?? a.scoreAuto,
      level: a.level,
      submittedAt: a.submittedAt,
    });
    if (result.length >= limit) break;
  }
  return result;
}

/* ---------- Panel "Tiến độ lớp" ---------- */

export interface ClassOverviewRow {
  id: string;
  code: string;
  name: string;
  examType: ExamPackage;
  status: "ACTIVE" | "UPCOMING";
  startDate: Date | null;
  /** Giáo viên chính (MAIN); null khi lớp chưa có giáo viên chính. */
  teacherName: string | null;
  /** Sĩ số = số ghi danh ACTIVE. */
  size: number;
  sessionsDone: number;
  /** null = vận hành chưa nhập tổng số buổi. */
  sessionsTotal: number | null;
  /** Số bài tập đang mở (OPEN) của lớp. */
  openAssignments: number;
  /** Σ lượt phải nộp / đã nộp trên các bài tập đang mở. */
  recipients: number;
  completed: number;
}

/** Lớp đang học trước, rồi lớp sắp khai giảng; kèm sĩ số, số buổi và tỷ lệ nộp
 * bài trên các bài tập đang mở của từng lớp. */
export async function getOpenClassRows(classIds: string[] | null, limit: number): Promise<ClassOverviewRow[]> {
  if (classIds && classIds.length === 0) return [];
  const classes = await prisma.class.findMany({
    where: { status: { in: [...OPEN_CLASS_STATUSES] }, ...(classIds ? { id: { in: classIds } } : {}) },
    // Enum Postgres sắp theo thứ tự khai báo (UPCOMING, ACTIVE, …) → desc = ACTIVE trước.
    orderBy: [{ status: "desc" }, { code: "asc" }],
    take: limit,
    select: {
      id: true,
      code: true,
      name: true,
      examType: true,
      status: true,
      startDate: true,
      sessionsDone: true,
      sessionsTotal: true,
      // Ô "Lớp" ghi giáo viên chính (HANDOFF 4.1) — lớp chỉ có trợ giảng hiện
      // "Chưa phân công giáo viên" thay vì ghi nhầm trợ giảng là giáo viên lớp.
      teachers: {
        where: { role: "MAIN" },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { teacher: { select: { name: true } } },
      },
      _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
    },
  });
  if (classes.length === 0) return [];

  const assignments = await prisma.assignment.findMany({
    where: { classId: { in: classes.map((c) => c.id) }, status: "OPEN" },
    select: { id: true, classId: true },
  });
  const recipientCounts =
    assignments.length === 0
      ? []
      : await prisma.assignmentRecipient.groupBy({
          by: ["assignmentId"],
          where: { assignmentId: { in: assignments.map((a) => a.id) } },
          _count: { _all: true, completedAt: true },
        });
  const countsByAssignment = new Map(recipientCounts.map((r) => [r.assignmentId, r._count]));

  const perClass = new Map<string, { open: number; recipients: number; completed: number }>();
  for (const a of assignments) {
    const agg = perClass.get(a.classId) ?? { open: 0, recipients: 0, completed: 0 };
    const counts = countsByAssignment.get(a.id);
    agg.open += 1;
    agg.recipients += counts?._all ?? 0;
    agg.completed += counts?.completedAt ?? 0;
    perClass.set(a.classId, agg);
  }

  return classes.map((c) => {
    const agg = perClass.get(c.id);
    return {
      id: c.id,
      code: c.code,
      name: c.name,
      examType: c.examType,
      status: c.status === "UPCOMING" ? "UPCOMING" : "ACTIVE",
      startDate: c.startDate,
      teacherName: c.teachers[0]?.teacher.name ?? null,
      size: c._count.enrollments,
      sessionsDone: c.sessionsDone,
      sessionsTotal: c.sessionsTotal,
      openAssignments: agg?.open ?? 0,
      recipients: agg?.recipients ?? 0,
      completed: agg?.completed ?? 0,
    };
  });
}
