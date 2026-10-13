import Link from "next/link";
import { Play, Clock, Flame, Target, ArrowUpRight, Mic, PenLine, BookOpen, Headphones, Gem, ClipboardCheck, LineChart, Lock } from "lucide-react";
import { StageCard } from "@/components/home/stage-intro";
import { formatRelativeOrDate } from "@/lib/format";
import { QUESTION_TYPES, SKILL_LABELS_VI, type Skill, type ExamPackage } from "@/lib/question-types";
import { ClassWeekStrip, ClassScheduleList } from "@/components/home/class-schedule-panel";
import { WEEKLY_GOAL_SESSIONS, type WeeklyActivityStats } from "@/lib/overview-activity-queries";
import type { ActiveClassInfo, ResumeSessionInfo, ClassWeekSession } from "@/lib/student-overview-queries";
import type { SkillProgress } from "@/lib/mock-dashboard";
import type { StudentAssignmentSummary } from "@/lib/student-assignment-queries";
import { ASSIGNMENT_KIND_LABEL, DUE_TONE_STYLE, dueLabel } from "@/components/home/assignments/assignment-labels";

const SKILL_ORDER: Skill[] = ["speaking", "writing", "reading", "listening"];
const SKILL_ICONS: Record<Skill, typeof Mic> = { speaking: Mic, writing: PenLine, reading: BookOpen, listening: Headphones };

function resumeTitle(session: ResumeSessionInfo): { title: string; subtitle: string } {
  if (session.mode === "question" && session.questionTypeId) {
    const type = QUESTION_TYPES.find((t) => t.id === session.questionTypeId);
    if (type) return { title: type.name, subtitle: `Question Test · ${SKILL_LABELS_VI[type.skill]}` };
  }
  // Mock test của bài tập được giao gồm nhiều dạng: mode "question", không có questionTypeId.
  if (session.mode === "question") {
    return {
      title: "Mock test bài tập",
      subtitle: session.skill ? SKILL_LABELS_VI[session.skill as Skill] : "Nhiều dạng bài",
    };
  }
  if (session.mode === "section" && session.skill) {
    return { title: "Section Test", subtitle: SKILL_LABELS_VI[session.skill as Skill] };
  }
  if (session.mode === "tu") {
    return { title: "Thi thử Đề Tủ", subtitle: "Write From Dictation · Repeat Sentence" };
  }
  return { title: "Full Test", subtitle: "Trọn bộ 4 kỹ năng" };
}

function WeeklyGoalCard({ daysActive, streak }: { daysActive: number; streak: number }) {
  return (
    <div data-card className="flex min-w-0 flex-col rounded-2xl p-5.5" style={{ background: "#e7f5fc", color: "var(--rail-charcoal)", boxShadow: "0 10px 28px -10px rgba(43,33,32,.18), 0 2px 6px rgba(43,33,32,.05)" }}>
      <p className="m-0 text-[16px] font-bold">Mục tiêu tuần</p>
      <p className="mt-1 mb-4 text-[15px]" style={{ color: "var(--rail-ink-dim)" }}>
        Luyện đủ {WEEKLY_GOAL_SESSIONS} buổi trong tuần để giữ nhịp ôn thi.
      </p>
      <span className="grid size-10 shrink-0 place-items-center rounded-full" style={{ background: "rgba(43,33,32,.08)" }}>
        <Target className="size-5" style={{ color: "var(--rail-red)" }} />
      </span>
      <p className="mt-3 mb-0 flex items-baseline gap-1.5">
        <span className="text-[32px] leading-none font-bold">{daysActive}</span>
        <span className="text-[15px]" style={{ color: "var(--rail-ink-dim)" }}>
          / {WEEKLY_GOAL_SESSIONS} buổi đã hoàn thành
        </span>
      </p>
      <div className="mt-3 flex gap-1.5">
        {Array.from({ length: WEEKLY_GOAL_SESSIONS }, (_, i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full"
            style={{ background: i < daysActive ? "var(--rail-red)" : "rgba(43,33,32,.12)" }}
          />
        ))}
      </div>
      {streak > 0 && (
        <p className="mt-3.5 mb-0 flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: "var(--rail-ink-dim)" }}>
          <Flame className="size-3.5" style={{ color: "var(--rail-red)" }} /> Chuỗi {streak} ngày liên tiếp
        </p>
      )}
    </div>
  );
}

function ActivityBarChart({ activity }: { activity: WeeklyActivityStats }) {
  const maxMinutes = Math.max(10, ...activity.days.map((d) => d.minutes));
  const avgMinutes = activity.daysActive > 0 ? Math.round(activity.totalMinutes / activity.daysActive) : 0;
  const avgTop = avgMinutes > 0 ? Math.min(92, Math.round((avgMinutes / maxMinutes) * 60)) : 0;

  return (
    <StageCard>
      <div className="mb-4 flex items-center justify-between gap-3">
        <b className="text-[16px]" style={{ color: "var(--rail-charcoal)" }}>
          Hoạt động luyện tập
        </b>
        <span
          className="rounded-full border px-2.5 py-1 text-[13px] font-semibold"
          style={{ borderColor: "var(--rail-line)", color: "var(--rail-ink-dim)" }}
        >
          Tuần này
        </span>
      </div>
      <div className="relative flex h-[88px] items-end justify-between gap-2">
        {avgMinutes > 0 && (
          <div
            className="pointer-events-none absolute right-0 left-0 flex items-center"
            style={{ bottom: `${avgTop + 18}px` }}
          >
            <div className="h-px w-full border-t border-dashed" style={{ borderColor: "var(--rail-ink-dim)" }} />
            <span className="absolute right-0 -translate-y-1/2 pl-1 text-xs font-semibold whitespace-nowrap" style={{ color: "var(--rail-ink-dim)", background: "var(--rail-bg)" }}>
              TB {avgMinutes}&apos;
            </span>
          </div>
        )}
        {activity.days.map((d, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex h-[60px] w-full flex-col items-center justify-end">
              {d.minutes > 0 ? (
                <>
                  <span className="mb-1 text-xs font-bold" style={{ color: "var(--rail-charcoal)" }}>
                    {d.minutes}&apos;
                  </span>
                  <div
                    className="w-full max-w-5 rounded-t-sm"
                    style={{
                      height: `${Math.max(6, Math.round((d.minutes / maxMinutes) * 60))}px`,
                      background: d.isToday ? "var(--rail-red)" : "var(--rail-red-soft)",
                    }}
                  />
                </>
              ) : (
                <span className="mb-1.5 text-[13px] font-semibold" style={{ color: "var(--rail-line)" }}>
                  —
                </span>
              )}
            </div>
            <span className="text-xs" style={{ color: d.isToday ? "var(--rail-charcoal)" : "var(--rail-ink-dim)", fontWeight: d.isToday ? 700 : 400 }}>
              {d.label}
            </span>
          </div>
        ))}
      </div>
    </StageCard>
  );
}

function ClassInfoCard({ classInfo, weekSchedule }: { classInfo: ActiveClassInfo | null; weekSchedule: ClassWeekSession[] }) {
  if (!classInfo) {
    return (
      <StageCard>
        <p className="m-0 text-[13px] font-bold tracking-wide uppercase" style={{ color: "var(--rail-ink-dim)" }}>
          Lớp học
        </p>
        <p className="mt-1.5" style={{ color: "var(--rail-ink-dim)" }}>
          Bạn chưa được xếp vào lớp nào. Liên hệ PTE-Life để được tư vấn lộ trình và lớp phù hợp.
        </p>
      </StageCard>
    );
  }

  return (
    <StageCard>
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <p className="m-0 text-[13px] font-bold tracking-wide uppercase" style={{ color: "var(--rail-ink-dim)" }}>
          Lớp học của tôi
        </p>
        <Link href="/lop-hoc" aria-label="Xem chi tiết lớp học" style={{ color: "var(--rail-ink-dim)" }}>
          <ArrowUpRight className="size-4" />
        </Link>
      </div>
      <p className="m-0 mb-2 truncate text-[15px] font-bold" style={{ color: "var(--rail-charcoal)" }} title={classInfo.className}>
        {classInfo.className}
      </p>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {classInfo.targetScore != null && (
          <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[13px] font-bold" style={{ background: "var(--rail-red-tint)", color: "var(--rail-red-text)" }}>
            🎯 Mục tiêu {classInfo.targetScore}+
          </span>
        )}
        {classInfo.schedule && (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-bold" style={{ background: "var(--rail-surface)", color: "var(--rail-ink)" }}>
            <Clock className="size-3" /> {classInfo.schedule.split(" ").slice(1).join(" ") || classInfo.schedule}
          </span>
        )}
      </div>
      {classInfo.teacherName && (
        <div className="mb-3.5 flex items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold" style={{ background: "var(--rail-surface)", color: "var(--rail-ink)" }}>
            {classInfo.teacherName.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="m-0 truncate text-[15px] font-semibold" style={{ color: "var(--rail-ink)" }}>
              {classInfo.teacherName}
            </p>
            <p className="m-0 text-[13px]" style={{ color: "var(--rail-ink-dim)" }}>
              Giáo viên phụ trách
            </p>
          </div>
        </div>
      )}

      {weekSchedule.length > 0 && (
        <>
          <div className="mb-3.5">
            <ClassWeekStrip sessions={weekSchedule} />
          </div>
          <p className="m-0 mb-1.5 text-[13px] font-bold tracking-wide uppercase" style={{ color: "var(--rail-ink-dim)" }}>
            Lịch tuần này
          </p>
          <div className="mb-3.5">
            <ClassScheduleList sessions={weekSchedule} />
          </div>
        </>
      )}

      <span className="inline-flex w-full items-center justify-center rounded-lg border px-2.5 py-2 text-[14px] font-semibold" style={{ borderColor: "var(--rail-line)", color: "var(--rail-ink-dim)" }}>
        Xem lịch cả khoá · Sắp ra mắt
      </span>
    </StageCard>
  );
}

function ScoreBars({ skillProgress, targetScore, canPractice }: { skillProgress: SkillProgress[]; targetScore: number | null; canPractice: boolean }) {
  const bySkill = new Map(skillProgress.map((s) => [s.skill, s]));

  return (
    <StageCard>
      <div className="mb-3.5 flex items-baseline justify-between gap-3">
        <b className="text-[16px]" style={{ color: "var(--rail-charcoal)" }}>
          {targetScore != null ? "Điểm ước lượng so với mục tiêu" : "Điểm ước lượng theo kỹ năng"}
        </b>
        {targetScore != null && (
          <span className="text-[13px] font-semibold" style={{ color: "var(--rail-ink-dim)" }}>
            Mục tiêu {targetScore}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-3">
        {SKILL_ORDER.map((skill) => {
          const progress = bySkill.get(skill);
          const score = progress?.avgPteScore ?? null;
          const pct = score != null ? Math.min(100, Math.round((score / 90) * 100)) : 0;
          const targetPct = targetScore != null ? Math.min(100, Math.round((targetScore / 90) * 100)) : null;
          const needMore = score != null && targetScore != null && targetScore > score ? targetScore - score : null;
          const Icon = SKILL_ICONS[skill];
          return (
            <div key={skill}>
              <div className="mb-1 flex items-center justify-between text-[15px]">
                <span className="flex items-center gap-1.5" style={{ color: "var(--rail-ink)" }}>
                  <Icon className="size-3.5" style={{ color: "var(--rail-ink-dim)" }} /> {SKILL_LABELS_VI[skill]}
                </span>
                {score != null ? (
                  <span className="font-semibold" style={{ color: "var(--rail-charcoal)" }}>
                    {score}
                    {needMore != null && (
                      <span className="ml-1 text-[13px] font-semibold" style={{ color: "var(--rail-red-text)" }}>
                        · cần +{needMore}
                      </span>
                    )}
                  </span>
                ) : canPractice ? (
                  <Link href="/luyen-de-pte" className="text-[13px] font-semibold" style={{ color: "var(--rail-red-text)" }}>
                    Chưa có · Luyện ngay →
                  </Link>
                ) : (
                  <span className="text-[13px] font-semibold" style={{ color: "var(--rail-ink-dim)" }}>
                    Chưa có
                  </span>
                )}
              </div>
              <div className="relative h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--rail-line)" }}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--rail-red)" }} />
                {targetPct != null && (
                  <div className="absolute top-0 h-full w-0.5" style={{ left: `${targetPct}%`, background: "var(--rail-charcoal)" }} />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3.5 text-xs" style={{ color: "var(--rail-ink-dim)" }}>
        Điểm ước lượng dựa trên các câu đã luyện trên hệ thống, không phải điểm thi chính thức của Pearson.
      </p>
    </StageCard>
  );
}

function PracticeShortcutCard({
  icon,
  title,
  description,
  footer,
  href,
  locked = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  footer: React.ReactNode;
  href: string;
  locked?: boolean;
}) {
  const body = (
    <>
      <div className="mb-3 flex items-center gap-2.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl" style={{ background: "var(--rail-red-tint)", color: "var(--rail-red)" }}>
          {icon}
        </span>
        <b className="text-[19px]" style={{ color: "var(--rail-charcoal)" }}>
          {title}
        </b>
        {locked && <Lock className="ml-auto size-4 shrink-0" style={{ color: "var(--rail-ink-dim)" }} />}
      </div>
      <p className="m-0 mb-3 text-[16px]" style={{ color: "var(--rail-ink-dim)" }}>
        {description}
      </p>
      {locked ? (
        <p className="m-0 text-[13px] font-semibold" style={{ color: "var(--rail-ink-dim)" }}>
          Mở khoá khi bạn là học viên PTE-Life đã được xếp lớp.
        </p>
      ) : (
        footer
      )}
    </>
  );

  if (locked) {
    return (
      <div
        aria-disabled="true"
        data-card
        className="block min-w-0 cursor-not-allowed rounded-2xl p-5 opacity-60 select-none"
        style={{ background: "var(--rail-bg)", boxShadow: "0 10px 28px -10px rgba(43,33,32,.18), 0 2px 6px rgba(43,33,32,.05)" }}
      >
        {body}
      </div>
    );
  }

  return (
    <Link href={href} data-card className="block min-w-0 rounded-2xl p-5" style={{ background: "var(--rail-bg)", boxShadow: "0 10px 28px -10px rgba(43,33,32,.18), 0 2px 6px rgba(43,33,32,.05)" }}>
      {body}
    </Link>
  );
}

function MyPracticeSection({
  examPackage,
  practicedCount,
  totalCount,
  lastPracticedAt,
  resumeSession,
  hasActiveClass,
  tuPracticedCount,
  tuTotalCount,
}: {
  examPackage: ExamPackage;
  practicedCount: number;
  totalCount: number;
  tuPracticedCount: number;
  tuTotalCount: number;
  lastPracticedAt: string | null;
  resumeSession: ResumeSessionInfo | null;
  hasActiveClass: boolean;
}) {
  const pct = totalCount > 0 ? Math.round((practicedCount / totalCount) * 100) : 0;
  const tuPct = tuTotalCount > 0 ? Math.round((tuPracticedCount / tuTotalCount) * 100) : 0;

  return (
    <div>
      <div className="mb-3.5 flex items-baseline justify-between gap-3">
        <b className="text-[17px]" style={{ color: "var(--rail-charcoal)" }}>
          Luyện đề của tôi
        </b>
        {hasActiveClass && (
          <Link href="/luyen-de-pte" className="text-[15px] font-semibold" style={{ color: "var(--rail-red-text)" }}>
            Xem tất cả →
          </Link>
        )}
      </div>
      <div className={`grid grid-cols-1 gap-4 ${hasActiveClass ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
        <PracticeShortcutCard
          href={resumeSession ? `/mocktest/session/${resumeSession.id}` : "/luyen-de-pte"}
          locked={!hasActiveClass}
          icon={<LineChart className="size-4.5" />}
          title="Luyện đề PTE"
          description={`Đề thi thử theo cấu trúc PTE ${examPackage === "academic" ? "Academic" : "Core"}.`}
          footer={
            <>
              <div className="mb-1 flex items-center justify-between text-[13px] font-semibold" style={{ color: "var(--rail-charcoal)" }}>
                <span>
                  Đã làm {practicedCount}/{totalCount} câu
                </span>
                <span>{pct}%</span>
              </div>
              <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--rail-line)" }}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--rail-red)" }} />
              </div>
              <p className="m-0 flex items-center gap-1 text-xs" style={{ color: "var(--rail-ink-dim)" }}>
                <Clock className="size-3" />
                {lastPracticedAt ? `Làm gần nhất: ${formatRelativeOrDate(lastPracticedAt)}` : "Chưa luyện lần nào"}
              </p>
              {resumeSession && (
                <span className="mt-2 inline-flex items-center gap-1 text-[13px] font-bold" style={{ color: "var(--rail-red-text)" }}>
                  <Play className="size-3" fill="currentColor" /> Đang làm dở: {resumeTitle(resumeSession).title}
                </span>
              )}
            </>
          }
        />
        <PracticeShortcutCard
          href="/de-tu"
          locked={!hasActiveClass}
          icon={<Gem className="size-4.5" />}
          title="Luyện đề Tủ"
          description="Bộ câu hỏi luyện tập trọng tâm, cập nhật hằng tuần."
          footer={
            tuTotalCount > 0 ? (
              <>
                <div className="mb-1 flex items-center justify-between text-[13px] font-semibold" style={{ color: "var(--rail-charcoal)" }}>
                  <span>
                    Đã làm {tuPracticedCount}/{tuTotalCount} câu
                  </span>
                  <span>{tuPct}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--rail-line)" }}>
                  <div className="h-full rounded-full" style={{ width: `${tuPct}%`, background: "var(--rail-red)" }} />
                </div>
              </>
            ) : (
              <span className="inline-flex px-2 py-0.5 text-xs font-bold tracking-wide uppercase" style={{ background: "var(--rail-surface)", color: "var(--rail-ink-dim)" }}>
                Chưa có câu hỏi
              </span>
            )
          }
        />
        {!hasActiveClass && (
          <PracticeShortcutCard
            href="/test-dau-vao"
            icon={<ClipboardCheck className="size-4.5" />}
            title="Test đầu vào"
            description="Xác định điểm xuất phát để nhận lộ trình luyện tập phù hợp."
            footer={
              <span className="inline-flex items-center gap-1 text-[15px] font-bold" style={{ color: "var(--rail-red-text)" }}>
                Làm test đầu vào →
              </span>
            }
          />
        )}
      </div>
    </div>
  );
}

function AssignmentsCard({ assignments, openCount }: { assignments: StudentAssignmentSummary[]; openCount: number }) {
  return (
    <StageCard>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <b className="text-[16px]" style={{ color: "var(--rail-charcoal)" }}>
          Bài giáo viên giao
          {openCount > 0 && (
            <span className="ml-2 text-[13px] font-semibold" style={{ color: "var(--rail-ink-dim)" }}>
              {openCount} bài đang mở
            </span>
          )}
        </b>
        <Link href="/bai-tap" className="shrink-0 text-[15px] font-semibold" style={{ color: "var(--rail-red-text)" }}>
          Xem tất cả →
        </Link>
      </div>
      {assignments.length === 0 ? (
        <p className="m-0" style={{ color: "var(--rail-ink-dim)" }}>
          Chưa có bài tập nào được giao
        </p>
      ) : (
        <ul className="m-0 mt-2 flex list-none flex-col divide-y divide-[var(--rail-line)] p-0">
          {assignments.map((a) => {
            const completed = a.totalCount > 0 && a.submittedCount >= a.totalCount;
            const due = dueLabel(a.dueAt, { completed });
            const pct = a.totalCount > 0 ? Math.round((a.submittedCount / a.totalCount) * 100) : 0;
            return (
              <li key={a.id} className="py-3 first:pt-1 last:pb-0">
                <Link href="/bai-tap" className="group block min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="min-w-0 flex-1 truncate text-[15px] font-bold group-hover:underline" style={{ color: "var(--rail-charcoal)" }} title={a.title}>
                      {a.title}
                    </span>
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[13px] font-bold whitespace-nowrap" style={DUE_TONE_STYLE[due.tone]}>
                      {due.label}
                    </span>
                  </div>
                  <p className="mt-0.5 mb-1.5 text-[13px]" style={{ color: "var(--rail-ink-dim)" }}>
                    {ASSIGNMENT_KIND_LABEL[a.kind]} · Lớp {a.classCode} · Đã nộp {a.submittedCount}/{a.totalCount} câu
                    {a.pendingCount > 0 ? ` · ${a.pendingCount} chờ chấm` : ""}
                    {a.gradedCount > 0 ? ` · ${a.gradedCount} đã chấm` : ""}
                  </p>
                  <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--rail-line)" }} aria-hidden="true">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--rail-red)" }} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </StageCard>
  );
}

export function StudentOverviewView({
  classInfo,
  weekSchedule,
  resumeSession,
  skillProgress,
  activity,
  streak,
  examPackage,
  practicedCount,
  totalCount,
  lastPracticedAt,
  tuPracticedCount,
  tuTotalCount,
  assignments = [],
  openAssignmentCount = 0,
}: {
  /** Tối đa 3 bài đang mở (hạn gần nhất trước) cho thẻ "Bài giáo viên giao". */
  assignments?: StudentAssignmentSummary[];
  /** Tổng số bài đang mở của học viên. */
  openAssignmentCount?: number;
  classInfo: ActiveClassInfo | null;
  weekSchedule: ClassWeekSession[];
  resumeSession: ResumeSessionInfo | null;
  skillProgress: SkillProgress[];
  activity: WeeklyActivityStats;
  streak: number;
  examPackage: ExamPackage;
  practicedCount: number;
  totalCount: number;
  lastPracticedAt: string | null;
  tuPracticedCount: number;
  tuTotalCount: number;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="mb-3 text-[clamp(20px,2.2vw,26px)] leading-[1.15] font-bold text-balance" style={{ color: "var(--rail-charcoal)" }}>
          Theo dõi tiến độ luyện thi của bạn
        </h2>
        <p className="m-0 text-[15px]" style={{ color: "var(--rail-ink-dim)" }}>
          Mục tiêu, lịch học và tiến độ luyện tập của bạn.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <WeeklyGoalCard daysActive={activity.daysActive} streak={streak} />
        <ActivityBarChart activity={activity} />
        <div className="lg:row-span-2">
          <ClassInfoCard classInfo={classInfo} weekSchedule={weekSchedule} />
        </div>
        <div className="lg:col-span-2">
          <ScoreBars skillProgress={skillProgress} targetScore={classInfo?.targetScore ?? null} canPractice={classInfo !== null} />
        </div>
      </div>

      <MyPracticeSection
        examPackage={examPackage}
        practicedCount={practicedCount}
        totalCount={totalCount}
        lastPracticedAt={lastPracticedAt}
        resumeSession={resumeSession}
        hasActiveClass={classInfo !== null}
        tuPracticedCount={tuPracticedCount}
        tuTotalCount={tuTotalCount}
      />

      <div id="bai-giao-vien-giao">
        <AssignmentsCard assignments={assignments} openCount={openAssignmentCount} />
      </div>
    </div>
  );
}
