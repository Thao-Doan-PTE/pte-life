import { prisma } from "@/lib/prisma";
import { QUESTION_TYPES, type Skill } from "@/lib/question-types";
import type { AssignmentKind } from "@/lib/generated/prisma/enums";
import { studentOpenAssignmentWhere } from "@/lib/admin/assignment-link";

/** Bài giáo viên giao cho 1 học viên (trang /bai-tap và thẻ "Bài giáo viên giao"
 * ở Tổng quan). Chỉ đọc bài tập học viên có tên trong danh sách phải nộp
 * (AssignmentRecipient) — không lộ bài tập của lớp/học viên khác. */

const DAY_MS = 24 * 60 * 60 * 1000;
/** Bài tập đã đóng vẫn hiện thêm ngần này ngày để học viên xem điểm/nhận xét. */
const RECENTLY_CLOSED_DAYS = 14;

export type StudentItemStatus = "todo" | "pending" | "graded" | "auto";

export interface StudentTeacherGrade {
  total: number;
  maxTotal: number;
  comment: string | null;
  gradedAt: string;
}

export interface StudentAssignmentItem {
  questionId: string;
  questionTypeId: string;
  /** Mã câu trong ngân hàng đề, vd "RA-012". */
  questionCode: string;
  /** Mã dạng bài, vd "RA". */
  typeCode: string;
  typeName: string;
  skill: Skill;
  /** Trang luyện tập của đúng câu này — nộp ở đó tự gắn vào bài tập. */
  practiceHref: string;
  status: StudentItemStatus;
  /** Lượt nộp được tính cho bài tập (lần nộp đầu tiên). */
  attemptId: string | null;
  submittedAt: string | null;
  /** Điểm AI / chấm tự động (0–100) — luôn giữ nguyên, điểm giáo viên lưu riêng. */
  aiScorePct: number | null;
  grade: StudentTeacherGrade | null;
}

export interface StudentAssignment {
  id: string;
  title: string;
  kind: AssignmentKind;
  status: "OPEN" | "CLOSED";
  note: string | null;
  classCode: string;
  className: string;
  dueAt: string | null;
  createdAt: string;
  items: StudentAssignmentItem[];
  submittedCount: number;
  totalCount: number;
  pendingCount: number;
  gradedCount: number;
}

function sortKey(a: StudentAssignment): [number, number, number] {
  return [a.status === "OPEN" ? 0 : 1, a.dueAt ? new Date(a.dueAt).getTime() : Infinity, -new Date(a.createdAt).getTime()];
}

/** Bài đang mở (của lớp đang học) + bài đã đóng trong 14 ngày gần đây (theo lần
 * cập nhật cuối của bài tập — schema không có cột closedAt). Đang mở lên trước,
 * hạn gần nhất trước. */
export async function getStudentAssignments(userId: string): Promise<StudentAssignment[]> {
  const closedSince = new Date(Date.now() - RECENTLY_CLOSED_DAYS * DAY_MS);
  const rows = await prisma.assignment.findMany({
    where: {
      recipients: { some: { studentId: userId } },
      // Bài đang mở chỉ lấy của lớp học viên đang học và lớp còn mở (cùng quy tắc
      // gắn bài nộp — studentOpenAssignmentWhere): học viên đã chuyển lớp không
      // còn được mời làm bài của lớp cũ.
      OR: [studentOpenAssignmentWhere(userId), { status: "CLOSED", updatedAt: { gte: closedSince } }],
    },
    select: {
      id: true,
      title: true,
      kind: true,
      status: true,
      note: true,
      dueAt: true,
      createdAt: true,
      class: { select: { code: true, name: true } },
      items: {
        orderBy: { position: "asc" },
        select: {
          questionId: true,
          question: { select: { code: true, questionTypeId: true, skill: true, bank: true } },
        },
      },
      attempts: {
        where: { userId },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          questionId: true,
          scorePct: true,
          reviewStatus: true,
          createdAt: true,
          grade: { select: { total: true, maxTotal: true, comment: true, gradedAt: true } },
        },
      },
    },
    // Thứ tự enum trong Postgres: OPEN trước CLOSED — giữ bài đang mở và mới nhất
    // khi cắt 100 dòng (sắp xếp hiển thị làm lại trong bộ nhớ bên dưới).
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  const result = rows.map((row): StudentAssignment => {
    // Lần nộp đầu tiên của mỗi câu là bài nộp được tính (resolveAssignmentLink).
    const attemptByQuestion = new Map<string, (typeof row.attempts)[number]>();
    for (const a of row.attempts) {
      if (!attemptByQuestion.has(a.questionId)) attemptByQuestion.set(a.questionId, a);
    }

    const items = row.items.map((item): StudentAssignmentItem => {
      const q = item.question;
      const type = QUESTION_TYPES.find((t) => t.id === q.questionTypeId);
      const skill = (type?.skill ?? q.skill) as Skill;
      const attempt = attemptByQuestion.get(item.questionId) ?? null;
      const status: StudentItemStatus = !attempt
        ? "todo"
        : attempt.grade
          ? "graded"
          : attempt.reviewStatus === "PENDING"
            ? "pending"
            : "auto";
      return {
        questionId: item.questionId,
        questionTypeId: q.questionTypeId,
        questionCode: q.code,
        typeCode: type?.code ?? q.questionTypeId,
        typeName: type?.name ?? q.questionTypeId,
        skill,
        practiceHref: `/practice/${skill}/${q.questionTypeId}/${item.questionId}${q.bank === "TU" ? "?bank=TU" : ""}`,
        status,
        attemptId: attempt?.id ?? null,
        submittedAt: attempt?.createdAt.toISOString() ?? null,
        aiScorePct: attempt?.scorePct ?? null,
        grade: attempt?.grade
          ? {
              total: attempt.grade.total,
              maxTotal: attempt.grade.maxTotal,
              comment: attempt.grade.comment,
              gradedAt: attempt.grade.gradedAt.toISOString(),
            }
          : null,
      };
    });

    return {
      id: row.id,
      title: row.title,
      kind: row.kind,
      status: row.status === "OPEN" ? "OPEN" : "CLOSED",
      note: row.note,
      classCode: row.class.code,
      className: row.class.name,
      dueAt: row.dueAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      items,
      submittedCount: items.filter((i) => i.status !== "todo").length,
      totalCount: items.length,
      pendingCount: items.filter((i) => i.status === "pending").length,
      gradedCount: items.filter((i) => i.status === "graded").length,
    };
  });

  return result.sort((a, b) => {
    const ka = sortKey(a);
    const kb = sortKey(b);
    return ka[0] - kb[0] || ka[1] - kb[1] || ka[2] - kb[2];
  });
}

/** Tóm tắt gọn cho thẻ "Bài giáo viên giao" ở trang Tổng quan. */
export interface StudentAssignmentSummary {
  id: string;
  title: string;
  kind: AssignmentKind;
  classCode: string;
  dueAt: string | null;
  submittedCount: number;
  totalCount: number;
  pendingCount: number;
  gradedCount: number;
}

export function toAssignmentSummary(a: StudentAssignment): StudentAssignmentSummary {
  return {
    id: a.id,
    title: a.title,
    kind: a.kind,
    classCode: a.classCode,
    dueAt: a.dueAt,
    submittedCount: a.submittedCount,
    totalCount: a.totalCount,
    pendingCount: a.pendingCount,
    gradedCount: a.gradedCount,
  };
}
