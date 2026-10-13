import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { ENTRY_TEST_SECTIONS } from "@/lib/entry-test-data";
import { gradeEntryTestAttempt } from "@/lib/entry-test-grading";

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
