import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { QUESTION_TYPES, SKILL_LABELS, type ExamPackage, type Skill } from "@/lib/question-types";
import { getRecentAttempts, getSkillProgress } from "@/lib/dashboard-queries";
import { expiringStudentsWhere } from "@/lib/admin/overview-queries";
import { isTuTrialActive } from "@/lib/student-access";
import {
  formatVnDate,
  formatVnDateTime,
  getStudentStatus,
  type StudentStatus,
  type StudentStatusKey,
} from "@/lib/admin/student-status";

/** Truy vấn cho màn "Học viên & gói học" (HANDOFF mục 4.2).
 * Module server thường (KHÔNG phải "use server") và KHÔNG tự kiểm tra quyền:
 * nơi gọi phải gọi requireAdminPage("viewStudents") trước, và truyền
 * scopedClassIds = getScopedClassIds(user) để giáo viên thuần (nếu sau này được
 * cấp quyền xem) chỉ nhận học viên lớp mình — giới hạn nằm ngay trong câu truy vấn.
 * Mọi giá trị trả về đều serialize được (ngày là chuỗi ISO / chuỗi đã định dạng)
 * để truyền thẳng sang client component. */

export interface StudentClassRef {
  id: string;
  code: string;
  name: string;
  examType: ExamPackage;
  targetScore: number | null;
  teacherName: string | null;
}

export interface StudentEntryTest {
  /** Điểm phần tự chấm (Word + Reading) — Speaking/Listening chờ giáo viên chấm. */
  scoreTotal: number | null;
  level: string | null;
  /** Nhãn ngắn để hiện trong bảng, VD "PTE 50–58" / "Nền tảng". */
  levelShort: string | null;
  submittedLabel: string | null;
  graded: boolean;
}

/** Điểm mục tiêu dùng cho cột "Đầu vào → mục tiêu": điểm riêng của học viên
 * (User.targetScore) nếu có, không thì điểm mục tiêu của lớp đang học. */
export interface StudentTarget {
  score: number;
  source: "student" | "class";
  /** Mã lớp khi source = "class". */
  classCode: string | null;
}

export interface StudentRow {
  id: string;
  name: string;
  email: string;
  examPackage: ExamPackage;
  expiresAt: string;
  expiresLabel: string;
  reservationsLeft: number;
  /** Ngày hết bảo lưu (ISO) — chỉ để hiện nhãn, null nếu chưa từng bảo lưu theo cách mới. */
  reservedUntil: string | null;
  status: StudentStatus;
  /** Điểm mục tiêu riêng của học viên (null = dùng mục tiêu của lớp). */
  targetScore: number | null;
  target: StudentTarget | null;
  /** Tài khoản bị khoá (UserStatus INACTIVE). */
  locked: boolean;
  /** Hạn dùng thử Luyện đề Tủ (ISO, hết ngày giờ VN) — null = chưa từng mời / đã tắt. */
  tuTrialUntil: string | null;
  /** Còn hạn dùng thử Tủ — cùng cách tính với phần chặn quyền (isTuTrialActive). */
  tuTrialActive: boolean;
  /** "dd/mm" (giờ VN) của tuTrialUntil để hiện nhãn ngắn; null nếu chưa mời. */
  tuTrialLabel: string | null;
  /** Lớp đang học hiển thị (ưu tiên lớp đang lọc, sau đó lớp vào gần nhất). */
  activeClass: StudentClassRef | null;
  /** Mọi lớp ACTIVE của học viên, mới vào trước (1 học viên có thể ở nhiều lớp). */
  activeClasses: StudentClassRef[];
  entryTest: StudentEntryTest | null;
  practice: {
    attempts: number;
    /** Điểm trung bình (%) mọi lượt luyện tập; null nếu chưa luyện. */
    avgScorePct: number | null;
    lastLabel: string | null;
  };
}

export interface StudentListOptions {
  examPackage?: ExamPackage;
  /** Chỉ học viên đang học lớp này (link "Danh sách HV" từ trang Lớp học). */
  classId?: string;
  /** null = không giới hạn; mảng = chỉ học viên thuộc các lớp này. */
  scopedClassIds?: string[] | null;
  ids?: string[];
  /** Chỉ nhóm "Cần xử lý": hết hạn hoặc còn ≤ 14 ngày, từng được xếp lớp, tài
   * khoản đang mở, không đang bảo lưu — cùng điều kiện với KPI ở Tổng quan
   * (expiringStudentsWhere). Bộ lọc "Sắp hết hạn" / "Hết hạn" cũng bật cờ này. */
  attention?: boolean;
  /** Theo việc từng được xếp lớp (quyết định 9A):
   * - "placed": chỉ người từng được xếp lớp (mọi bộ lọc danh sách học viên thường).
   * - "never": chỉ người chưa từng được xếp lớp — "Khách tiềm năng" (tự đăng ký /
   *   tạo từ Test đầu vào).
   * - bỏ trống: không lọc (tra 1 học viên theo id để mở drawer, kể cả khách tiềm năng). */
  placement?: "placed" | "never";
  /** Chỉ tài khoản đang trong danh sách mời dùng thử Luyện đề Tủ (còn hạn). Người
   * dùng thử thường chưa từng xếp lớp → nơi gọi để trống `placement`. */
  tuTrial?: boolean;
}

function shortLevel(level: string | null): string | null {
  if (!level) return null;
  return level.replace(/^Mục tiêu\s+/i, "");
}

/** dd/mm theo giờ Việt Nam (nhãn ngắn "Dùng thử Tủ đến dd/mm"). */
function formatVnDayMonth(date: Date): string {
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });
}

export async function listStudents(opts: StudentListOptions = {}): Promise<StudentRow[]> {
  const now = new Date();
  const and: Prisma.UserWhereInput[] = [{ roles: { has: "STUDENT" } }];
  if (opts.attention) and.push(expiringStudentsWhere(now));
  if (opts.placement === "placed") and.push({ classEnrollments: { some: {} } });
  if (opts.placement === "never") and.push({ classEnrollments: { none: {} } });
  // Cùng điều kiện với isTuTrialActive (còn hạn = tuTrialUntil ≥ lúc này).
  if (opts.tuTrial) and.push({ tuTrialUntil: { gte: now } });
  if (opts.ids) and.push({ id: { in: opts.ids } });
  if (opts.examPackage) and.push({ examPackage: opts.examPackage });
  if (opts.classId) and.push({ classEnrollments: { some: { classId: opts.classId, status: "ACTIVE" } } });
  if (opts.scopedClassIds) {
    and.push({ classEnrollments: { some: { classId: { in: opts.scopedClassIds }, status: "ACTIVE" } } });
  }
  const where: Prisma.UserWhereInput = { AND: and };

  const [users, practice] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ expiresAt: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        examPackage: true,
        expiresAt: true,
        reservationsLeft: true,
        reservedUntil: true,
        targetScore: true,
        status: true,
        tuTrialUntil: true,
        classEnrollments: {
          where: { status: "ACTIVE" },
          orderBy: { joinedAt: "desc" },
          select: {
            class: {
              select: {
                id: true,
                code: true,
                name: true,
                examType: true,
                targetScore: true,
                teachers: {
                  orderBy: { role: "asc" }, // MAIN trước ASSISTANT
                  take: 1,
                  select: { teacher: { select: { name: true } } },
                },
              },
            },
          },
        },
        entryTestAttempts: {
          where: { status: { in: ["SUBMITTED", "GRADED"] } },
          orderBy: { submittedAt: { sort: "desc", nulls: "last" } },
          take: 1,
          select: { scoreTotal: true, level: true, submittedAt: true, status: true },
        },
      },
    }),
    // Tiến độ luyện tập: 1 câu groupBy cho mọi học viên khớp bộ lọc.
    prisma.practiceAttempt.groupBy({
      by: ["userId"],
      where: { user: where },
      _count: { _all: true },
      _avg: { scorePct: true },
      _max: { createdAt: true },
    }),
  ]);

  const practiceByUser = new Map(practice.map((p) => [p.userId, p]));

  return users.map((u) => {
    const activeClasses: StudentClassRef[] = u.classEnrollments.map(({ class: c }) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      examType: c.examType,
      targetScore: c.targetScore,
      teacherName: c.teachers[0]?.teacher.name ?? null,
    }));
    const activeClass =
      (opts.classId ? activeClasses.find((c) => c.id === opts.classId) : undefined) ?? activeClasses[0] ?? null;

    const attempt = u.entryTestAttempts[0];
    const p = practiceByUser.get(u.id);
    const target: StudentTarget | null =
      u.targetScore !== null
        ? { score: u.targetScore, source: "student", classCode: null }
        : activeClass?.targetScore != null
          ? { score: activeClass.targetScore, source: "class", classCode: activeClass.code }
          : null;

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      examPackage: u.examPackage,
      expiresAt: u.expiresAt.toISOString(),
      expiresLabel: formatVnDate(u.expiresAt),
      reservationsLeft: u.reservationsLeft,
      reservedUntil: u.reservedUntil?.toISOString() ?? null,
      status: getStudentStatus(u.expiresAt, u.reservedUntil, now),
      targetScore: u.targetScore,
      target,
      locked: u.status === "INACTIVE",
      tuTrialUntil: u.tuTrialUntil?.toISOString() ?? null,
      tuTrialActive: isTuTrialActive(u.tuTrialUntil, now),
      tuTrialLabel: u.tuTrialUntil ? formatVnDayMonth(u.tuTrialUntil) : null,
      activeClass,
      activeClasses,
      entryTest: attempt
        ? {
            scoreTotal: attempt.scoreTotal,
            level: attempt.level,
            levelShort: shortLevel(attempt.level),
            submittedLabel: attempt.submittedAt ? formatVnDate(attempt.submittedAt) : null,
            graded: attempt.status === "GRADED",
          }
        : null,
      practice: {
        attempts: p?._count._all ?? 0,
        avgScorePct: p?._avg.scorePct != null ? Math.round(p._avg.scorePct) : null,
        lastLabel: p?._max.createdAt ? formatVnDate(p._max.createdAt) : null,
      },
    };
  });
}

/** Bỏ dấu tiếng Việt + chữ thường để tìm kiếm không phân biệt dấu ("nguyen" khớp "Nguyễn"). */
export function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

/** Lọc theo ô tìm (tên hoặc email, không phân biệt dấu) và trạng thái gói học. */
export function filterStudentRows(
  rows: StudentRow[],
  { q, status }: { q?: string; status?: StudentStatusKey }
): StudentRow[] {
  const needle = q ? normalizeSearch(q) : "";
  return rows.filter((r) => {
    if (status && r.status.key !== status) return false;
    if (!needle) return true;
    return normalizeSearch(r.name).includes(needle) || r.email.toLowerCase().includes(needle);
  });
}

/* ------------------------------------------------------------------------ */

export interface StudentSkillLine {
  skill: Skill;
  label: string;
  /** % số câu đã luyện trên tổng câu của kỹ năng. */
  progressPct: number;
  practicedQuestions: number;
  totalQuestions: number;
  avgPteScore: number | null;
}

export interface StudentActivityLine {
  id: string;
  typeCode: string;
  typeName: string;
  scorePct: number;
  atLabel: string;
}

export interface StudentHistoryLine {
  /** "r_<id>" (ReservationLog) hoặc "a_<id>" (AuditLog). */
  id: string;
  atLabel: string;
  /** Nhóm thao tác: Gói học, Lớp học, Mục tiêu, Bài tập… */
  label: string;
  detail: string;
  actorName: string | null;
}

export interface StudentDetail {
  row: StudentRow;
  skills: StudentSkillLine[];
  recent: StudentActivityLine[];
  /** Các thao tác gần nhất của riêng học viên (mới nhất trước): gói học
   * (ReservationLog) + mọi dòng AuditLog có targetUserId = học viên hoặc ghi
   * trực tiếp lên tài khoản (entityType "User", entityId = học viên — VD khoá /
   * mở khoá, đổi vai trò ở lib/actions/users.ts — các dòng cũ trước khi có
   * targetUserId). */
  history: StudentHistoryLine[];
}

const HISTORY_LIMIT = 8;

/** Các thao tác gói học ghi CẢ ReservationLog lẫn AuditLog (lib/actions/admin.ts)
 * → chỉ lấy bản ReservationLog để mỗi thao tác hiện 1 lần (giống /admin/logs). */
const PLAN_AUDIT_ACTIONS = ["change_package", "extend", "reservation"];

const CLASS_ENTITY_TYPES = ["Class", "ClassEnrollment", "ClassTeacher"];

/** Nhãn dự phòng khi dòng AuditLog không có detail. */
const AUDIT_ACTION_TEXT: Record<string, string> = {
  enroll_student: "Xếp vào lớp",
  remove_enrollment: "Rời lớp",
  leave_class: "Rời lớp (chuyển lớp)",
  set_target_score: "Đổi điểm mục tiêu",
  set_tu_trial: "Đổi dùng thử Luyện đề Tủ",
  update_roles: "Đổi vai trò",
  toggle_status: "Đổi trạng thái tài khoản",
  grade_attempt: "Chấm bài",
};

function auditGroupLabel(entityType: string, action: string): string {
  if (CLASS_ENTITY_TYPES.includes(entityType)) return "Lớp học";
  if (action === "set_target_score") return "Mục tiêu";
  if (action === "set_tu_trial") return "Dùng thử Tủ";
  if (entityType === "Assignment" || entityType === "AssignmentRecipient") return "Bài tập";
  if (entityType === "PracticeAttempt" || entityType === "AttemptGrade" || action === "grade_attempt") return "Chấm bài";
  if (entityType === "EntryTestAttempt") return "Test đầu vào";
  if (entityType === "User") return "Tài khoản";
  return "Khác";
}

function auditDetailText(
  log: { action: string; entityType: string; detail: string | null },
  classCode: string | undefined
): string {
  if (log.entityType === "Class") {
    // Xếp/rời lớp: viết lại ngắn gọn theo mã lớp (detail cũ chứa tên/email học viên).
    if (log.action === "enroll_student") return `Xếp vào lớp ${classCode ?? "(lớp đã xoá)"}`;
    if (log.action === "remove_enrollment") return `Rời lớp ${classCode ?? "(lớp đã xoá)"}`;
  }
  if (log.entityType === "User" && log.action === "toggle_status") {
    // detail cũ ghi tên enum ("Đổi trạng thái thành: INACTIVE") → viết lại dễ đọc.
    if (log.detail?.endsWith("INACTIVE")) return "Khoá tài khoản";
    if (log.detail?.endsWith("ACTIVE")) return "Mở khoá tài khoản";
  }
  const base = log.detail || AUDIT_ACTION_TEXT[log.action] || log.action;
  return log.entityType === "Class" && classCode && !base.includes(classCode) ? `Lớp ${classCode} — ${base}` : base;
}

async function getStudentHistory(studentId: string): Promise<StudentHistoryLine[]> {
  const [planLogs, auditLogs] = await Promise.all([
    prisma.reservationLog.findMany({
      where: { userId: studentId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: HISTORY_LIMIT,
      select: { id: true, detail: true, createdAt: true, performedById: true },
    }),
    prisma.auditLog.findMany({
      where: {
        AND: [
          { OR: [{ targetUserId: studentId }, { entityType: "User", entityId: studentId }] },
          { NOT: { entityType: "User", action: { in: PLAN_AUDIT_ACTIONS } } },
        ],
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: HISTORY_LIMIT,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        detail: true,
        createdAt: true,
        actor: { select: { name: true } },
      },
    }),
  ]);

  // ReservationLog.performedById không có quan hệ → tra tên riêng; mã lớp cho dòng lớp học.
  const actorIds = [...new Set(planLogs.map((l) => l.performedById))];
  const classIds = [...new Set(auditLogs.filter((l) => l.entityType === "Class").map((l) => l.entityId))];
  const [actors, classes] = await Promise.all([
    actorIds.length
      ? prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } })
      : Promise.resolve([]),
    classIds.length
      ? prisma.class.findMany({ where: { id: { in: classIds } }, select: { id: true, code: true } })
      : Promise.resolve([]),
  ]);
  const actorName = new Map(actors.map((a) => [a.id, a.name]));
  const classCode = new Map(classes.map((c) => [c.id, c.code]));

  return [
    ...planLogs.map((l) => ({
      id: `r_${l.id}`,
      at: l.createdAt,
      label: "Gói học",
      detail: l.detail,
      actorName: actorName.get(l.performedById) ?? null,
    })),
    ...auditLogs.map((l) => ({
      id: `a_${l.id}`,
      at: l.createdAt,
      label: auditGroupLabel(l.entityType, l.action),
      detail: auditDetailText(l, l.entityType === "Class" ? classCode.get(l.entityId) : undefined),
      actorName: l.actor.name,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime() || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0))
    .slice(0, HISTORY_LIMIT)
    .map(({ at, ...h }) => ({ ...h, atLabel: formatVnDateTime(at) }));
}

export async function getStudentDetail(
  studentId: string,
  scopedClassIds: string[] | null = null
): Promise<StudentDetail | null> {
  const [row] = await listStudents({ ids: [studentId], scopedClassIds });
  if (!row) return null;

  const [skills, recentAttempts, history] = await Promise.all([
    getSkillProgress(row.id),
    getRecentAttempts(row.id, 5),
    getStudentHistory(row.id),
  ]);

  const typeById = new Map(QUESTION_TYPES.map((t) => [t.id, t]));

  return {
    row,
    skills: skills.map((s) => ({
      skill: s.skill,
      label: SKILL_LABELS[s.skill],
      progressPct: s.progressPct,
      practicedQuestions: s.practicedQuestions,
      totalQuestions: s.totalQuestions,
      avgPteScore: s.avgPteScore,
    })),
    recent: recentAttempts.map((a) => {
      const type = typeById.get(a.questionTypeId);
      return {
        id: a.id,
        typeCode: type?.code ?? a.questionTypeId,
        typeName: type?.name ?? a.questionTypeId,
        scorePct: a.scorePct,
        atLabel: formatVnDate(a.attemptedAt),
      };
    }),
    history,
  };
}

/* ------------------------------------------------------------------------ */

export interface PlaceableClass {
  id: string;
  code: string;
  name: string;
  status: "ACTIVE" | "UPCOMING";
  teacherName: string | null;
  studentCount: number;
}

/** Lớp có thể xếp học viên vào: đang học / sắp khai giảng và CÙNG gói học
 * (HANDOFF mục 5 — "Xếp lớp: chỉ vào lớp cùng gói"). */
export async function getPlaceableClasses(examPackage: ExamPackage): Promise<PlaceableClass[]> {
  const classes = await prisma.class.findMany({
    where: { examType: examPackage, status: { in: ["ACTIVE", "UPCOMING"] } },
    orderBy: [{ status: "desc" }, { code: "asc" }], // ACTIVE trước UPCOMING (thứ tự enum)
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      teachers: { orderBy: { role: "asc" }, take: 1, select: { teacher: { select: { name: true } } } },
      _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
    },
  });
  return classes.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
    status: c.status as "ACTIVE" | "UPCOMING",
    teacherName: c.teachers[0]?.teacher.name ?? null,
    studentCount: c._count.enrollments,
  }));
}

/** Thông tin ngắn của lớp đang lọc (hiện nhãn "Lọc theo lớp …"). */
export async function getClassBrief(
  classId: string,
  scopedClassIds: string[] | null = null
): Promise<{ id: string; code: string; name: string } | null> {
  if (scopedClassIds && !scopedClassIds.includes(classId)) return null;
  return prisma.class.findUnique({ where: { id: classId }, select: { id: true, code: true, name: true } });
}
