import { prisma } from "@/lib/prisma";
import { WEEKDAY_LABELS_VI, startOfWeekMonday } from "@/lib/week-utils";

export interface ActiveClassInfo {
  className: string;
  examType: "academic" | "core";
  targetScore: number | null;
  schedule: string | null;
  teacherName: string | null;
}

/** Lớp đang học (ACTIVE) gần nhất của học viên, kèm giáo viên chính (MAIN) nếu có. */
export async function getActiveClassInfo(userId: string): Promise<ActiveClassInfo | null> {
  const enrollment = await prisma.classEnrollment.findFirst({
    where: { studentId: userId, status: "ACTIVE" },
    orderBy: { joinedAt: "desc" },
    include: {
      class: {
        include: {
          teachers: { include: { teacher: true }, orderBy: { role: "asc" } },
        },
      },
    },
  });
  if (!enrollment) return null;

  const mainTeacher = enrollment.class.teachers.find((t) => t.role === "MAIN") ?? enrollment.class.teachers[0];

  return {
    className: enrollment.class.name,
    examType: enrollment.class.examType,
    targetScore: enrollment.class.targetScore,
    schedule: enrollment.class.schedule,
    teacherName: mainTeacher?.teacher.name ?? null,
  };
}

const WEEKDAY_CODE_TO_INDEX: Record<string, number> = { CN: 0, T2: 1, T3: 2, T4: 3, T5: 4, T6: 5, T7: 6 };

function parseClassSchedule(schedule: string | null): { weekdays: number[]; timeRange: string | null } {
  if (!schedule) return { weekdays: [], timeRange: null };
  const [dayPart, ...rest] = schedule.trim().split(/\s+/);
  const timeRange = rest.join(" ") || null;
  const weekdays = (dayPart ?? "")
    .split("-")
    .map((code) => WEEKDAY_CODE_TO_INDEX[code.toUpperCase()])
    .filter((idx): idx is number => idx !== undefined);
  return { weekdays, timeRange };
}

export interface ClassWeekSession {
  dateLabel: string;
  weekdayLabel: string;
  timeRange: string | null;
  status: "done" | "today" | "tomorrow" | "upcoming";
}

/** Lịch học trong TUẦN HIỆN TẠI, suy ra từ chuỗi tự do Class.schedule (vd.
 * "T2-T4-T6 19:30-21:00"). Không có bảng buổi học riêng nên chỉ dựng được lịch
 * tuần này theo quy luật lặp hàng tuần, không phản ánh buổi nghỉ/đổi lịch đột xuất. */
export function getClassWeekSchedule(schedule: string | null, now: Date = new Date()): ClassWeekSession[] {
  const { weekdays, timeRange } = parseClassSchedule(schedule);
  if (weekdays.length === 0) return [];

  const monday = startOfWeekMonday(now);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const sessions: ClassWeekSession[] = [];
  for (let offset = 0; offset < 7; offset++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + offset);
    const weekdayIdx = date.getDay();
    if (!weekdays.includes(weekdayIdx)) continue;

    let status: ClassWeekSession["status"] = "upcoming";
    if (date.getTime() < today.getTime()) status = "done";
    else if (date.getTime() === today.getTime()) status = "today";
    else if (date.getTime() === tomorrow.getTime()) status = "tomorrow";

    sessions.push({
      dateLabel: `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`,
      weekdayLabel: WEEKDAY_LABELS_VI[weekdayIdx],
      timeRange,
      status,
    });
  }
  return sessions;
}

export interface ResumeSessionInfo {
  id: string;
  mode: string;
  skill: string | null;
  questionTypeId: string | null;
  currentIndex: number;
  totalQuestions: number;
  startedAt: string;
}

/** Mock Test session đang làm dở (chưa nộp) gần nhất, nếu có. */
export async function getResumeSession(userId: string): Promise<ResumeSessionInfo | null> {
  const session = await prisma.mockTestSession.findFirst({
    where: { userId, status: "in_progress" },
    orderBy: { startedAt: "desc" },
  });
  if (!session) return null;

  return {
    id: session.id,
    mode: session.mode,
    skill: session.skill,
    questionTypeId: session.questionTypeId,
    currentIndex: session.currentIndex,
    totalQuestions: session.questionIds.length,
    startedAt: session.startedAt.toISOString(),
  };
}
