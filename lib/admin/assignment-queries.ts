import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { AssignmentKind, AssignmentStatus, ClassEnrollmentStatus, ClassStatus, ExamPackage } from "@/lib/generated/prisma/enums";
import { questionExcerpt } from "@/lib/question-excerpt";
import { getTeacherGradedTypeIds } from "@/lib/admin/rubrics";
import {
  ASSIGNABLE_CLASS_STATUSES,
  ASSIGNMENT_FILTERS,
  compareTypeOrder,
  STATUS_ORDER,
  typeCodeOf,
  type AssignmentFilterKey,
} from "@/components/admin/assignments/assignment-meta";

/** Truy vấn cho màn Giao bài tập (HANDOFF §4.5). Module chỉ chạy ở server —
 * KHÔNG phải server action. Trang gọi nó PHẢI requireAdminPage("manageAssignments")
 * trước và truyền phạm vi lớp từ getScopedClassIdsFor(user, "manageAssignments"):
 * null = mọi lớp (Admin / Trưởng học thuật), mảng = chỉ các lớp người dùng được
 * phân công (giới hạn nằm ngay trong câu truy vấn). */

type ClassScope = string[] | null;

/** Ghi danh được tính là "học viên phải nộp" khi giao bài: ghi danh ACTIVE, tài
 * khoản chưa bị khoá và còn role STUDENT. Dùng chung cho bản chụp người nhận
 * (createAssignmentAction) và số học viên xem trước trên form để hai bên luôn khớp. */
export const assignmentRecipientEnrollmentWhere = {
  status: "ACTIVE",
  student: { status: "ACTIVE", roles: { has: "STUDENT" } },
} satisfies Prisma.ClassEnrollmentWhereInput;

function scopeWhere(scope: ClassScope) {
  return scope ? { classId: { in: scope } } : {};
}

// ===== Danh sách bài tập =====

export interface AssignmentListRow {
  id: string;
  title: string;
  kind: AssignmentKind;
  status: AssignmentStatus;
  typeCodes: string[];
  itemCount: number;
  dueAt: Date | null;
  createdAt: Date;
  class: { id: string; code: string; name: string; examType: ExamPackage; status: ClassStatus };
  /** Số học viên phải nộp (chốt lúc giao). */
  recipientsTotal: number;
  /** Học viên đã nộp đủ mọi câu. */
  recipientsCompleted: number;
  /** Học viên đã nộp ít nhất 1 câu của bài (đếm theo PracticeAttempt — cùng định
   * nghĩa với trang chi tiết; lượt Mock test bấm qua mà không trả lời không tính). */
  recipientsSubmitted: number;
  /** Bài làm đang chờ giáo viên chấm. */
  pendingReview: number;
}

export type AssignmentFilterCounts = Record<AssignmentFilterKey, number>;

export async function listAssignments(
  scope: ClassScope,
  filter: AssignmentFilterKey
): Promise<{ rows: AssignmentListRow[]; counts: AssignmentFilterCounts }> {
  const emptyCounts: AssignmentFilterCounts = { open: 0, closed: 0, archived: 0, all: 0 };
  if (scope && scope.length === 0) return { rows: [], counts: emptyCounts };

  const statuses = [...(ASSIGNMENT_FILTERS.find((f) => f.key === filter)?.statuses ?? ["OPEN"])];
  const [raw, byStatus] = await Promise.all([
    prisma.assignment.findMany({
      where: { ...scopeWhere(scope), status: { in: statuses } },
      select: {
        id: true,
        title: true,
        kind: true,
        status: true,
        questionTypeIds: true,
        dueAt: true,
        createdAt: true,
        class: { select: { id: true, code: true, name: true, examType: true, status: true } },
        _count: { select: { items: true, recipients: true } },
      },
    }),
    prisma.assignment.groupBy({ by: ["status"], where: scopeWhere(scope), _count: { _all: true } }),
  ]);

  const statusCount = (s: AssignmentStatus) => byStatus.find((r) => r.status === s)?._count._all ?? 0;
  const counts: AssignmentFilterCounts = {
    open: statusCount("OPEN"),
    closed: statusCount("CLOSED"),
    archived: statusCount("ARCHIVED"),
    all: statusCount("OPEN") + statusCount("CLOSED"),
  };

  const ids = raw.map((a) => a.id);
  const [completed, attemptPairs, pending] =
    ids.length > 0
      ? await Promise.all([
          prisma.assignmentRecipient.groupBy({
            by: ["assignmentId"],
            where: { assignmentId: { in: ids }, completedAt: { not: null } },
            _count: { _all: true },
          }),
          prisma.practiceAttempt.groupBy({ by: ["assignmentId", "userId"], where: { assignmentId: { in: ids } } }),
          prisma.practiceAttempt.groupBy({
            by: ["assignmentId"],
            where: { assignmentId: { in: ids }, reviewStatus: "PENDING" },
            _count: { _all: true },
          }),
        ])
      : [[], [], []];

  const completedBy = new Map(completed.map((c) => [c.assignmentId, c._count._all]));
  const pendingBy = new Map(pending.map((p) => [p.assignmentId, p._count._all]));
  const submittedBy = new Map<string, Set<string>>();
  for (const p of attemptPairs) {
    if (!p.assignmentId) continue;
    const set = submittedBy.get(p.assignmentId) ?? new Set<string>();
    set.add(p.userId);
    submittedBy.set(p.assignmentId, set);
  }

  const rows: AssignmentListRow[] = raw
    .map((a) => ({
      id: a.id,
      title: a.title,
      kind: a.kind,
      status: a.status,
      typeCodes: [...a.questionTypeIds].sort(compareTypeOrder).map(typeCodeOf),
      itemCount: a._count.items,
      dueAt: a.dueAt,
      createdAt: a.createdAt,
      class: a.class,
      recipientsTotal: a._count.recipients,
      recipientsCompleted: completedBy.get(a.id) ?? 0,
      recipientsSubmitted: submittedBy.get(a.id)?.size ?? 0,
      pendingReview: pendingBy.get(a.id) ?? 0,
    }))
    .sort(
      (a, b) =>
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
        (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity) ||
        b.createdAt.getTime() - a.createdAt.getTime()
    );

  return { rows, counts };
}

// ===== Dữ liệu cho form "Giao bài mới" =====

export interface AssignableClass {
  id: string;
  code: string;
  name: string;
  examType: ExamPackage;
  status: ClassStatus;
  /** Học viên đang học (ghi danh ACTIVE, tài khoản chưa khoá, role STUDENT) = số
   * học viên sẽ phải nộp (assignmentRecipientEnrollmentWhere). */
  studentCount: number;
}

/** Số câu dùng được (chưa lưu trữ, áp dụng cho gói) theo dạng bài: tổng và số câu Tủ. */
export type QuestionCountsByType = Record<string, { total: number; tu: number }>;

export interface AssignmentFormData {
  classes: AssignableClass[];
  questionCounts: Partial<Record<ExamPackage, QuestionCountsByType>>;
  /** Dạng bài giáo viên chấm theo rubric (bài nộp sẽ vào hàng chờ Chấm bài). */
  teacherGradedTypeIds: string[];
}

/** Lớp giao bài được: trong phạm vi người dùng, đang học hoặc sắp khai giảng. */
export async function getAssignableClasses(scope: ClassScope): Promise<AssignableClass[]> {
  if (scope && scope.length === 0) return [];
  const rows = await prisma.class.findMany({
    where: { status: { in: ASSIGNABLE_CLASS_STATUSES }, ...(scope ? { id: { in: scope } } : {}) },
    select: {
      id: true,
      code: true,
      name: true,
      examType: true,
      status: true,
      _count: { select: { enrollments: { where: assignmentRecipientEnrollmentWhere } } },
    },
  });
  return rows
    .map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      examType: c.examType,
      status: c.status,
      studentCount: c._count.enrollments,
    }))
    .sort((a, b) => (a.status === b.status ? a.code.localeCompare(b.code, "vi") : a.status === "ACTIVE" ? -1 : 1));
}

export async function getQuestionCountsByType(pkg: ExamPackage): Promise<QuestionCountsByType> {
  const rows = await prisma.question.groupBy({
    by: ["questionTypeId", "bank"],
    where: { archivedAt: null, availableIn: { has: pkg } },
    _count: { _all: true },
  });
  const counts: QuestionCountsByType = {};
  for (const r of rows) {
    const entry = (counts[r.questionTypeId] ??= { total: 0, tu: 0 });
    entry.total += r._count._all;
    if (r.bank === "TU") entry.tu += r._count._all;
  }
  return counts;
}

export async function getAssignmentFormData(scope: ClassScope): Promise<AssignmentFormData> {
  const classes = await getAssignableClasses(scope);
  const packages = [...new Set(classes.map((c) => c.examType))];
  const [countsList, graded] = await Promise.all([
    Promise.all(packages.map((p) => getQuestionCountsByType(p))),
    classes.length > 0 ? getTeacherGradedTypeIds() : Promise.resolve(new Set<string>()),
  ]);
  const questionCounts: AssignmentFormData["questionCounts"] = {};
  packages.forEach((p, i) => {
    questionCounts[p] = countsList[i];
  });
  return { classes, questionCounts, teacherGradedTypeIds: [...graded] };
}

// ===== Chi tiết 1 bài tập =====

export interface AssignmentDetailItem {
  position: number;
  questionId: string;
  code: string;
  questionTypeId: string;
  typeCode: string;
  isTu: boolean;
  archived: boolean;
  excerpt: string;
}

export interface AssignmentDetailRecipient {
  studentId: string;
  name: string;
  email: string;
  completedAt: Date | null;
  /** Số câu khác nhau đã nộp cho bài này. */
  submittedCount: number;
  /** Bài làm đang chờ giáo viên chấm. */
  pendingCount: number;
  /** Đã rời lớp sau khi được giao bài (vẫn giữ trong danh sách phải nộp). */
  leftClass: boolean;
}

export interface AssignmentDetail {
  id: string;
  title: string;
  kind: AssignmentKind;
  status: AssignmentStatus;
  typeCodes: string[];
  note: string | null;
  dueAt: Date | null;
  notify: boolean;
  createdAt: Date;
  createdByName: string;
  class: { id: string; code: string; name: string; examType: ExamPackage; status: ClassStatus };
  items: AssignmentDetailItem[];
  recipients: AssignmentDetailRecipient[];
  pendingTotal: number;
}

/** null nếu không có bài tập hoặc bài tập thuộc lớp ngoài phạm vi người dùng
 * (trang trả 404 — không lộ việc bài tập có tồn tại). */
export async function getAssignmentDetail(id: string, scope: ClassScope): Promise<AssignmentDetail | null> {
  if (!id || id.length > 64) return null;
  const a = await prisma.assignment.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      kind: true,
      status: true,
      questionTypeIds: true,
      note: true,
      dueAt: true,
      notify: true,
      createdAt: true,
      classId: true,
      class: { select: { id: true, code: true, name: true, examType: true, status: true } },
      createdBy: { select: { name: true } },
      items: {
        orderBy: { position: "asc" },
        select: {
          position: true,
          question: { select: { id: true, code: true, questionTypeId: true, bank: true, content: true, archivedAt: true } },
        },
      },
      recipients: {
        select: { studentId: true, completedAt: true, student: { select: { name: true, email: true } } },
      },
    },
  });
  if (!a || (scope && !scope.includes(a.classId))) return null;

  const studentIds = a.recipients.map((r) => r.studentId);
  const [pairs, pendingByUser, enrollments] = await Promise.all([
    prisma.practiceAttempt.groupBy({ by: ["userId", "questionId"], where: { assignmentId: a.id } }),
    prisma.practiceAttempt.groupBy({
      by: ["userId"],
      where: { assignmentId: a.id, reviewStatus: "PENDING" },
      _count: { _all: true },
    }),
    studentIds.length > 0
      ? prisma.classEnrollment.findMany({
          where: { classId: a.classId, studentId: { in: studentIds } },
          select: { studentId: true, status: true },
        })
      : Promise.resolve([] as { studentId: string; status: ClassEnrollmentStatus }[]),
  ]);

  const itemQuestionIds = new Set(a.items.map((i) => i.question.id));
  const submittedBy = new Map<string, number>();
  for (const p of pairs) {
    if (!itemQuestionIds.has(p.questionId)) continue;
    submittedBy.set(p.userId, (submittedBy.get(p.userId) ?? 0) + 1);
  }
  const pendingBy = new Map(pendingByUser.map((p) => [p.userId, p._count._all]));
  const enrollmentStatus = new Map(enrollments.map((e) => [e.studentId, e.status]));

  const recipients: AssignmentDetailRecipient[] = a.recipients
    .map((r) => ({
      studentId: r.studentId,
      name: r.student.name,
      email: r.student.email,
      completedAt: r.completedAt,
      submittedCount: submittedBy.get(r.studentId) ?? 0,
      pendingCount: pendingBy.get(r.studentId) ?? 0,
      leftClass: enrollmentStatus.get(r.studentId) !== "ACTIVE",
    }))
    .sort(
      (x, y) =>
        Number(x.completedAt !== null) - Number(y.completedAt !== null) || x.name.localeCompare(y.name, "vi")
    );

  return {
    id: a.id,
    title: a.title,
    kind: a.kind,
    status: a.status,
    typeCodes: [...a.questionTypeIds].sort(compareTypeOrder).map(typeCodeOf),
    note: a.note,
    dueAt: a.dueAt,
    notify: a.notify,
    createdAt: a.createdAt,
    createdByName: a.createdBy.name,
    class: a.class,
    items: a.items.map((i) => ({
      position: i.position,
      questionId: i.question.id,
      code: i.question.code,
      questionTypeId: i.question.questionTypeId,
      typeCode: typeCodeOf(i.question.questionTypeId),
      isTu: i.question.bank === "TU",
      archived: i.question.archivedAt !== null,
      excerpt:
        typeof i.question.content === "object" && i.question.content !== null && !Array.isArray(i.question.content)
          ? questionExcerpt(i.question.content as Record<string, unknown>)
          : "(không có nội dung xem trước)",
    })),
    recipients,
    pendingTotal: recipients.reduce((sum, r) => sum + r.pendingCount, 0),
  };
}
