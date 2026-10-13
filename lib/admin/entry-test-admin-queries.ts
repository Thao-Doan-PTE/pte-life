import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { ConsultationStatus, EntryTestPurpose } from "@/lib/generated/prisma/enums";
import { ENTRY_TEST_SECTIONS, type EntryTestQuestion, type EntryTestSection } from "@/lib/entry-test-data";
import { gradeEntryTestAttempt, gradeEntryTestQuestion } from "@/lib/entry-test-grading";
import { normalizeEmail } from "@/lib/user-email";

/** Truy vấn cho trang Admin "Test đầu vào" (HANDOFF §4.3). Module server thường
 * (không phải "use server") — chỉ gọi từ trang đã kiểm tra quyền
 * requireAdminPage("viewEntryTests"); phạm vi giáo viên truyền vào qua
 * scopedClassIds (getScopedClassIds) và được áp ngay trong câu truy vấn. */

export const ENTRY_TEST_ADMIN_PAGE_SIZE = 50;

export type EntryTestPlacementFilter = "all" | "unplaced" | "placed";

/** Cấu trúc điểm của đề hiện tại — tính từ chính dữ liệu đề + hàm chấm, không
 * hard-code: thang thô 100 điểm, phần tự chấm (Từ vựng–ngữ pháp + Reading) tối
 * đa 40, Speaking/Listening chờ giáo viên chấm. */
const EMPTY_SUMMARY = gradeEntryTestAttempt(ENTRY_TEST_SECTIONS, {});
const sectionInfo = (s: (typeof EMPTY_SUMMARY.sections)[number]) => ({
  name: s.name,
  nameVi: ENTRY_TEST_SECTIONS.find((sec) => sec.key === s.key)?.nameVi ?? s.name,
  max: s.pointsMax,
});
export const ENTRY_TEST_SCALE = {
  totalMax: ENTRY_TEST_SECTIONS.reduce((sum, s) => sum + s.pointsLabel, 0),
  autoMax: EMPTY_SUMMARY.gradeableMax,
  autoSections: EMPTY_SUMMARY.sections.filter((s) => !s.pending).map(sectionInfo),
  teacherSections: EMPTY_SUMMARY.sections.filter((s) => s.pending).map(sectionInfo),
};

/** Phần do giáo viên chấm tay (Speaking/Listening ở đề hiện tại) — suy ra từ hàm
 * chấm thay vì hard-code, giống ENTRY_TEST_SCALE. */
const TEACHER_SECTION_KEYS = new Set(EMPTY_SUMMARY.sections.filter((s) => s.pending).map((s) => s.key));

const SUBMITTED_STATUSES = ["SUBMITTED", "GRADED"] as const;

function attemptWhere(
  filter: EntryTestPlacementFilter,
  scopedClassIds: string[] | null
): Prisma.EntryTestAttemptWhereInput {
  const userConditions: Prisma.UserWhereInput[] = [];
  // Giáo viên thuần: chỉ người làm test đang học (ACTIVE) ở lớp mình phụ trách.
  if (scopedClassIds) {
    userConditions.push({ classEnrollments: { some: { status: "ACTIVE", classId: { in: scopedClassIds } } } });
  }
  if (filter === "unplaced") userConditions.push({ classEnrollments: { none: { status: "ACTIVE" } } });
  if (filter === "placed") userConditions.push({ classEnrollments: { some: { status: "ACTIVE" } } });

  return {
    status: { in: [...SUBMITTED_STATUSES] },
    ...(userConditions.length > 0 ? { user: { AND: userConditions } } : {}),
  };
}

export interface EntryTestAdminRow {
  id: string;
  submittedAt: Date | null;
  status: "IN_PROGRESS" | "SUBMITTED" | "GRADED";
  scoreAuto: number | null;
  scoreSpeaking: number | null;
  scoreTotal: number | null;
  level: string | null;
  autoSubmitted: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    examPackage: "academic" | "core";
  };
  /** Lớp đang học (ACTIVE) — với giáo viên chỉ gồm lớp của mình. */
  activeClasses: { id: string; code: string; name: string }[];
  isPlaced: boolean;
  /** Chưa từng được xếp vào lớp nào (không có bất kỳ ClassEnrollment nào). */
  isProspect: boolean;
}

export async function getEntryTestAdminList({
  filter,
  page,
  scopedClassIds,
}: {
  filter: EntryTestPlacementFilter;
  page: number;
  scopedClassIds: string[] | null;
}): Promise<{ rows: EntryTestAdminRow[]; total: number; page: number; pageCount: number }> {
  const where = attemptWhere(filter, scopedClassIds);
  const total = await prisma.entryTestAttempt.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / ENTRY_TEST_ADMIN_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), pageCount);

  const attempts = await prisma.entryTestAttempt.findMany({
    where,
    orderBy: [{ submittedAt: "desc" }, { startedAt: "desc" }],
    skip: (safePage - 1) * ENTRY_TEST_ADMIN_PAGE_SIZE,
    take: ENTRY_TEST_ADMIN_PAGE_SIZE,
    select: {
      id: true,
      submittedAt: true,
      status: true,
      scoreAuto: true,
      scoreSpeaking: true,
      scoreTotal: true,
      level: true,
      autoSubmitted: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          examPackage: true,
          // Giáo viên thuần: không tải _count toàn bộ ghi danh (lớp của giáo viên khác).
          ...(scopedClassIds ? {} : { _count: { select: { classEnrollments: true } } }),
          classEnrollments: {
            // Phạm vi giáo viên áp ngay trong truy vấn: chỉ tải lớp của mình.
            where: { status: "ACTIVE", ...(scopedClassIds ? { classId: { in: scopedClassIds } } : {}) },
            orderBy: { joinedAt: "desc" },
            select: { class: { select: { id: true, code: true, name: true } } },
          },
        },
      },
    },
  });

  const rows: EntryTestAdminRow[] = attempts.map((a) => {
    const activeClasses = a.user.classEnrollments.map((e) => e.class);
    // Phạm vi giáo viên: điều kiện where ngoài đã bắt buộc có lớp ACTIVE của giáo
    // viên → luôn "đã xếp lớp", không bao giờ là khách tiềm năng.
    const enrollmentCount = "_count" in a.user ? a.user._count.classEnrollments : 1;
    return {
      id: a.id,
      submittedAt: a.submittedAt,
      status: a.status,
      scoreAuto: a.scoreAuto,
      scoreSpeaking: a.scoreSpeaking,
      scoreTotal: a.scoreTotal,
      level: a.level,
      autoSubmitted: a.autoSubmitted,
      user: { id: a.user.id, name: a.user.name, email: a.user.email, examPackage: a.user.examPackage },
      activeClasses,
      isPlaced: scopedClassIds ? true : activeClasses.length > 0,
      isProspect: !scopedClassIds && activeClasses.length === 0 && enrollmentCount === 0,
    };
  });

  return { rows, total, page: safePage, pageCount };
}

/** Số lượt test theo từng tab lọc (cùng phạm vi lớp như danh sách). */
export async function getEntryTestFilterCounts(scopedClassIds: string[] | null) {
  const [all, unplaced, placed] = await Promise.all([
    prisma.entryTestAttempt.count({ where: attemptWhere("all", scopedClassIds) }),
    prisma.entryTestAttempt.count({ where: attemptWhere("unplaced", scopedClassIds) }),
    prisma.entryTestAttempt.count({ where: attemptWhere("placed", scopedClassIds) }),
  ]);
  return { all, unplaced, placed };
}

/** Yêu cầu tư vấn / học thử mới (status NEW), mới nhất trước — chỉ gọi khi người
 * xem có quyền viewStudents (Admin, Vận hành/CSKH). */
export async function getNewConsultationRequests(limit = 8) {
  const [rows, total] = await Promise.all([
    prisma.consultationRequest.findMany({
      where: { status: "NEW" },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        preferredDate: true,
        timeSlot: true,
        topic: true,
        note: true,
        createdAt: true,
      },
    }),
    prisma.consultationRequest.count({ where: { status: "NEW" } }),
  ]);
  return { rows, total };
}

/* ------------------------------------------------------------------ */
/* Chi tiết 1 lượt test (/admin/entry-tests/[attemptId])               */
/* ------------------------------------------------------------------ */

export interface EntryTestDetailItem {
  question: EntryTestQuestion;
  /** Câu trả lời đã lưu (EntryTestAnswer.responseText); null = không có bản ghi. */
  responseText: string | null;
  /** File ghi âm (Speaking S1) — chỉ giữ đường dẫn /uploads/... hoặc https. */
  audioUrl: string | null;
  /** Các đáp án chuẩn được chấp nhận; null = câu không có đáp án chuẩn. */
  correctAnswers: string[] | null;
  /** Điểm của câu; null khi đang chờ giáo viên chấm. */
  pointsAwarded: number | null;
  /** Câu chờ giáo viên chấm (Speaking/Listening, hoặc chưa có đáp án chuẩn). */
  pending: boolean;
  isCorrect: boolean | null;
  /** Câu tự chấm có điểm lưu lúc nộp khác điểm chấm lại theo đáp án hiện tại
   * (đáp án được sửa sau khi nộp). Điểm hiển thị vẫn là điểm đã lưu. */
  keyChanged: boolean;
  /** Điểm chấm lại theo đáp án hiện tại — chỉ có nghĩa khi keyChanged. */
  regradedPoints: number | null;
}

export interface EntryTestDetailSection {
  section: EntryTestSection;
  /** Phần do giáo viên chấm tay (không tự chấm). */
  teacherGraded: boolean;
  /** Điểm cả phần; null khi còn câu chờ chấm. */
  pointsAwarded: number | null;
  pointsMax: number;
  items: EntryTestDetailItem[];
}

export interface EntryTestLeadInfo {
  name: string;
  /** Chỉ có giá trị khi người xem có quyền viewStudents. */
  phone: string | null;
  email: string | null;
  targetScore: string;
  purpose: EntryTestPurpose;
  examTimeline: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  createdAt: Date;
}

export interface EntryTestConsultationInfo {
  id: string;
  phone: string;
  topic: string;
  preferredDate: Date;
  timeSlot: string;
  note: string | null;
  status: ConsultationStatus;
  createdAt: Date;
}

export interface EntryTestAttemptDetail {
  id: string;
  status: "IN_PROGRESS" | "SUBMITTED" | "GRADED";
  startedAt: Date;
  submittedAt: Date | null;
  autoSubmitted: boolean;
  scoreAuto: number | null;
  scoreSpeaking: number | null;
  scoreTotal: number | null;
  level: string | null;
  gradedAt: Date | null;
  gradedByName: string | null;
  user: { id: string; name: string; email: string; examPackage: "academic" | "core" };
  /** Lớp đang học (ACTIVE) — với giáo viên chỉ gồm lớp của mình. */
  activeClasses: { id: string; code: string; name: string }[];
  isPlaced: boolean;
  isProspect: boolean;
  sections: EntryTestDetailSection[];
  /** Đăng ký Test đầu vào (EntryTestLead) mới nhất khớp email, không phân biệt hoa thường. */
  lead: EntryTestLeadInfo | null;
  /** Số bản đăng ký khớp email (có thể > 1 nếu đăng ký nhiều lần). */
  leadCount: number;
  /** null = người xem không có quyền viewStudents (không tải). */
  consultations: EntryTestConsultationInfo[] | null;
}

/** File ghi âm chỉ được phát khi là file tải lên của hệ thống (/uploads/...) hoặc https (Vercel Blob). */
function safeAudioUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("/uploads/") && !url.includes("..")) return url;
  try {
    return new URL(url).protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function correctAnswersOf(q: EntryTestQuestion): string[] | null {
  switch (q.type) {
    case "read_aloud":
      return null;
    case "mcq":
      return [q.answer];
    case "dropdown_gap":
      return q.answer == null ? null : [q.answer];
    case "word_form":
    case "reorder":
      return q.answer.length > 0 ? q.answer : null;
    case "gap_fill":
    case "short_answer":
      return q.answer && q.answer.length > 0 ? q.answer : null;
    default:
      return null;
  }
}

const CONSULTATION_LIMIT = 20;

/**
 * Chi tiết 1 lượt test đã nộp. Áp ĐÚNG điều kiện của danh sách (attemptWhere):
 * chỉ lượt SUBMITTED/GRADED; giáo viên thuần chỉ thấy người làm test đang học ở
 * lớp mình → ngoài phạm vi trả null (trang gọi notFound, không lộ việc lượt test
 * tồn tại). SĐT và yêu cầu tư vấn chỉ tải khi includeContact (quyền viewStudents).
 */
export async function getEntryTestAttemptDetail({
  attemptId,
  scopedClassIds,
  includeContact,
}: {
  attemptId: string;
  scopedClassIds: string[] | null;
  includeContact: boolean;
}): Promise<EntryTestAttemptDetail | null> {
  if (!attemptId || attemptId.length > 64) return null;

  const attempt = await prisma.entryTestAttempt.findFirst({
    where: { ...attemptWhere("all", scopedClassIds), id: attemptId },
    select: {
      id: true,
      status: true,
      startedAt: true,
      submittedAt: true,
      autoSubmitted: true,
      scoreAuto: true,
      scoreSpeaking: true,
      scoreTotal: true,
      level: true,
      gradedAt: true,
      gradedBy: { select: { name: true } },
      answers: {
        select: { questionId: true, responseText: true, audioUrl: true, isCorrect: true, pointsAwarded: true },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          examPackage: true,
          ...(scopedClassIds ? {} : { _count: { select: { classEnrollments: true } } }),
          classEnrollments: {
            where: { status: "ACTIVE", ...(scopedClassIds ? { classId: { in: scopedClassIds } } : {}) },
            orderBy: { joinedAt: "desc" },
            select: { class: { select: { id: true, code: true, name: true } } },
          },
        },
      },
    },
  });
  if (!attempt) return null;

  // EntryTestLead không có khoá tới User — khớp theo email, không phân biệt hoa
  // thường. Prisma dịch "insensitive" thành ILIKE nên escape %/_ (như
  // findUserByEmail), rồi lọc lại chính xác ở dưới cho chắc.
  const email = normalizeEmail(attempt.user.email);
  const escaped = email.replace(/[\\%_]/g, (c) => `\\${c}`);

  const [leadRows, consultationRows] = await Promise.all([
    email
      ? prisma.entryTestLead.findMany({
          where: { OR: [{ email }, { email: { equals: escaped, mode: "insensitive" } }] },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            name: true,
            phone: includeContact,
            email: true,
            targetScore: true,
            purpose: true,
            examTimeline: true,
            utmSource: true,
            utmMedium: true,
            utmCampaign: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
    includeContact
      ? prisma.consultationRequest.findMany({
          where: { userId: attempt.user.id },
          orderBy: { createdAt: "desc" },
          take: CONSULTATION_LIMIT,
          select: {
            id: true,
            phone: true,
            topic: true,
            preferredDate: true,
            timeSlot: true,
            note: true,
            status: true,
            createdAt: true,
          },
        })
      : Promise.resolve(null),
  ]);

  const leads = leadRows.filter((l) => normalizeEmail(l.email ?? "") === email);
  const latestLead = leads[0];
  const lead: EntryTestLeadInfo | null = latestLead
    ? {
        name: latestLead.name,
        phone: includeContact ? (latestLead.phone ?? null) : null,
        email: latestLead.email,
        targetScore: latestLead.targetScore,
        purpose: latestLead.purpose,
        examTimeline: latestLead.examTimeline,
        utmSource: latestLead.utmSource,
        utmMedium: latestLead.utmMedium,
        utmCampaign: latestLead.utmCampaign,
        createdAt: latestLead.createdAt,
      }
    : null;

  const answerById = new Map(attempt.answers.map((a) => [a.questionId, a]));
  const isGraded = attempt.status === "GRADED";

  const sections: EntryTestDetailSection[] = ENTRY_TEST_SECTIONS.map((section) => {
    const teacherGraded = TEACHER_SECTION_KEYS.has(section.key);
    const items: EntryTestDetailItem[] = section.items.map((q) => {
      const saved = answerById.get(q.id);
      const responseText = saved?.responseText ?? null;
      let pointsAwarded: number | null;
      let regradedPoints: number | null = null;
      let keyChanged = false;
      if (teacherGraded) {
        // Phần chấm tay: chỉ coi là có điểm khi lượt đã được giáo viên chấm.
        pointsAwarded = isGraded ? (saved?.pointsAwarded ?? null) : null;
      } else {
        // Điểm đã lưu lúc nộp là chuẩn (scoreAuto tính từ đó); thiếu bản ghi thì
        // chấm lại từ câu trả lời. Đáp án còn có thể đổi trong giai đoạn thử
        // nghiệm → đánh dấu câu mà điểm lưu khác điểm chấm theo đáp án hiện tại.
        regradedPoints = gradeEntryTestQuestion(q, responseText);
        const savedPoints = saved?.pointsAwarded ?? null;
        keyChanged = savedPoints != null && regradedPoints != null && regradedPoints !== savedPoints;
        pointsAwarded = savedPoints ?? regradedPoints;
      }
      return {
        question: q,
        responseText,
        audioUrl: safeAudioUrl(saved?.audioUrl),
        correctAnswers: correctAnswersOf(q),
        pointsAwarded,
        pending: pointsAwarded == null,
        isCorrect: pointsAwarded == null ? null : (saved?.isCorrect ?? pointsAwarded > 0),
        keyChanged,
        regradedPoints: keyChanged ? regradedPoints : null,
      };
    });
    const anyPending = items.some((i) => i.pending);
    let pointsAwarded: number | null = anyPending ? null : items.reduce((sum, i) => sum + (i.pointsAwarded ?? 0), 0);
    if (section.key === "speaking" && isGraded && attempt.scoreSpeaking != null) pointsAwarded = attempt.scoreSpeaking;
    return { section, teacherGraded, pointsAwarded, pointsMax: section.pointsLabel, items };
  });

  const activeClasses = attempt.user.classEnrollments.map((e) => e.class);
  const enrollmentCount = "_count" in attempt.user ? attempt.user._count.classEnrollments : 1;

  return {
    id: attempt.id,
    status: attempt.status,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
    autoSubmitted: attempt.autoSubmitted,
    scoreAuto: attempt.scoreAuto,
    scoreSpeaking: attempt.scoreSpeaking,
    scoreTotal: attempt.scoreTotal,
    level: attempt.level,
    gradedAt: attempt.gradedAt,
    gradedByName: attempt.gradedBy?.name ?? null,
    user: {
      id: attempt.user.id,
      name: attempt.user.name,
      email: attempt.user.email,
      examPackage: attempt.user.examPackage,
    },
    activeClasses,
    isPlaced: scopedClassIds ? true : activeClasses.length > 0,
    isProspect: !scopedClassIds && activeClasses.length === 0 && enrollmentCount === 0,
    sections,
    lead,
    leadCount: leads.length,
    consultations: consultationRows,
  };
}
