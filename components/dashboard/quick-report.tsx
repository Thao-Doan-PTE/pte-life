import Link from "next/link";
import { Zap, CalendarDays, Play, Target } from "lucide-react";
import {
  SKILL_LABELS,
  SKILL_ACCENT_COLOR,
  FREQUENCY_TIER_LABEL,
  type Skill,
  type FrequencyTier,
} from "@/lib/question-types";
import type { SkillProgress } from "@/lib/mock-dashboard";
import type { TypeProgress } from "@/lib/skill-progress-queries";
import type { QuickReportStats } from "@/lib/quick-report-queries";
import type { LastPracticedType } from "@/lib/practice-quicklaunch-queries";

const SKILLS: Skill[] = ["speaking", "writing", "reading", "listening"];
const TIER_PRIORITY: Record<FrequencyTier, number> = { SIEU: 0, CAO: 1, TB: 2, THAP: 3 };

export function QuickReport({
  skillProgress,
  typeProgress,
  stats,
  targetScore,
  resume,
}: {
  skillProgress: SkillProgress[];
  typeProgress: TypeProgress[];
  stats: QuickReportStats;
  targetScore: number | null;
  resume: LastPracticedType | null;
}) {
  const totalQuestions = typeProgress.reduce((sum, t) => sum + t.totalCount, 0);
  const totalDone = typeProgress.reduce((sum, t) => sum + t.practicedCount, 0);
  const donePct = totalQuestions > 0 ? Math.round((totalDone / totalQuestions) * 100) : 0;

  const weakestSkill = skillProgress.reduce<SkillProgress | null>(
    (worst, s) => (!worst || s.progressPct < worst.progressPct ? s : worst),
    null
  );

  const todo = typeProgress
    .filter((t) => t.totalCount > 0 && t.practicedCount < t.totalCount && t.id !== resume?.typeId)
    .sort((a, b) => {
      const pa = TIER_PRIORITY[a.frequencyTier ?? "THAP"] ?? 4;
      const pb = TIER_PRIORITY[b.frequencyTier ?? "THAP"] ?? 4;
      return pa - pb || a.practicedCount - b.practicedCount;
    })
    .slice(0, 2);

  const avgDonutPct = stats.avgScore != null ? Math.min(100, Math.round((stats.avgScore / 90) * 100)) : 0;

  if (totalDone === 0) {
    return (
      <div className="rounded-2xl bg-card p-8 text-center shadow-md">
        <div className="text-4xl">🎯</div>
        <h3 className="mt-2 text-[20px] font-bold">Bạn chưa bắt đầu luyện đề</h3>
        <div className="mt-4 flex items-center justify-center gap-4">
          <Link
            href="#chon-ky-nang"
            className="rounded-lg bg-primary px-4 py-2 text-[15px] font-bold text-primary-foreground"
          >
            Luyện tập ngay
          </Link>
          <Link
            href="/practice/listening/write-from-dictation"
            className="text-[15px] font-semibold text-foreground hover:underline"
          >
            hoặc bắt đầu với WFD →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card p-4 shadow-md">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-bold">Bạn đang ở đâu?</h2>
        <p className="text-[13px] text-muted-foreground">
          {stats.daysPracticed > 0 ? `Đã luyện ${stats.daysPracticed} ngày` : "Chưa có ngày luyện tập"}
          {targetScore != null ? ` · Mục tiêu: PTE ${targetScore}` : ""}
        </p>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl bg-card p-5 shadow-[0_16px_36px_-12px_rgba(43,33,32,0.4),0_4px_10px_rgba(43,33,32,0.1)] transition-transform duration-200 hover:-translate-y-1">
          <div className="flex size-[52px] shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
            <Zap className="size-6" />
          </div>
          <div className="min-w-0">
            <p className="m-0 text-[32px] leading-none font-bold">{totalDone}</p>
            <p className="m-0 mt-1.5 text-[15px] text-muted-foreground">Tổng luyện tập</p>
            <p className="m-0 text-[13px] text-muted-foreground">
              câu · {donePct}% kho đề ({totalQuestions} câu)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl bg-card p-5 shadow-[0_16px_36px_-12px_rgba(43,33,32,0.4),0_4px_10px_rgba(43,33,32,0.1)] transition-transform duration-200 hover:-translate-y-1">
          <div
            className="grid size-[52px] shrink-0 place-items-center rounded-full"
            style={{ background: `conic-gradient(var(--primary) ${avgDonutPct}%, var(--muted) 0)` }}
          >
            <div className="grid size-10 place-items-center rounded-full bg-card text-xs font-semibold">
              {stats.avgScore != null ? `${avgDonutPct}%` : "–"}
            </div>
          </div>
          <div className="min-w-0">
            <p className="m-0 text-[32px] leading-none font-bold">{stats.avgScore != null ? `${stats.avgScore}/90` : "–"}</p>
            <p className="m-0 mt-1.5 text-[15px] text-muted-foreground">Điểm trung bình</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl bg-card p-5 shadow-[0_16px_36px_-12px_rgba(43,33,32,0.4),0_4px_10px_rgba(43,33,32,0.1)] transition-transform duration-200 hover:-translate-y-1">
          <div className="flex size-[52px] shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
            <CalendarDays className="size-6" />
          </div>
          <div className="min-w-0">
            <p className="m-0 text-[32px] leading-none font-bold">{stats.daysPracticed}</p>
            <p className="m-0 mt-1.5 text-[15px] text-muted-foreground">Ngày luyện tập</p>
            <p className="m-0 text-[13px] text-muted-foreground">chuỗi {stats.streak} ngày liên tiếp</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-xl bg-muted/40 p-3">
          <h3 className="mb-2 text-[13px] font-bold tracking-wide text-muted-foreground uppercase">
            Tiến độ theo kỹ năng
          </h3>
          {SKILLS.map((skill, i) => {
            const s = skillProgress.find((p) => p.skill === skill);
            const pct = s?.progressPct ?? 0;
            return (
              <div
                key={skill}
                className={`grid grid-cols-[86px_1fr_92px] items-center gap-2.5 py-1.5 ${i > 0 ? "border-t border-dashed" : ""}`}
              >
                <span className="flex items-center gap-1.5 text-[15px] font-semibold">
                  <span className="size-2 shrink-0 rounded-full" style={{ background: SKILL_ACCENT_COLOR[skill] }} />
                  {SKILL_LABELS[skill]}
                </span>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.max(pct, 1)}%`, background: SKILL_ACCENT_COLOR[skill] }}
                  />
                </div>
                <span className="text-right text-[13px] text-muted-foreground">
                  <b className="text-foreground">{s?.practicedQuestions ?? 0}</b>/{s?.totalQuestions ?? 0}
                  {s?.avgPteScore != null ? (
                    <>
                      {" "}
                      · TB <b className="text-foreground">{s.avgPteScore}</b>
                    </>
                  ) : null}
                </span>
              </div>
            );
          })}
          {weakestSkill && (
            <p className="mt-2 rounded-lg bg-red-50 px-2.5 py-1.5 text-[13px] dark:bg-red-950/30">
              Cần ưu tiên: <b className="text-red-700 dark:text-red-400">{SKILL_LABELS[weakestSkill.skill]}</b> – mới
              hoàn thành {weakestSkill.progressPct}%
              {weakestSkill.avgPteScore != null ? `, điểm TB ${weakestSkill.avgPteScore}` : ""}.
            </p>
          )}
        </div>

        <div className="rounded-xl bg-muted/40 p-3">
          <h3 className="mb-2 text-[13px] font-bold tracking-wide text-muted-foreground uppercase">Bước tiếp theo</h3>
          <div className="mb-2 rounded-lg p-2.5 text-white" style={{ background: "#110D2D" }}>
            {resume ? (
              <>
                <p className="text-xs opacity-70">Tiếp tục bài đang dở</p>
                <p className="mt-0.5 mb-1.5 text-[15px] font-bold">
                  {resume.code} · {resume.name} – câu {resume.practicedCount}/{resume.totalCount}
                </p>
                <Link
                  href={`/practice/${resume.skill}/${resume.typeId}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-[13px] font-bold text-primary-foreground"
                >
                  <Play className="size-3" fill="currentColor" /> Luyện tiếp
                </Link>
              </>
            ) : (
              <p className="text-[15px] font-semibold">Chưa có bài đang làm dở.</p>
            )}
          </div>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {todo.map((t) => (
              <li key={t.id} className="flex items-center gap-2.5 rounded-lg bg-card p-2.5 shadow-sm">
                <span
                  className="shrink-0 rounded-md px-1.5 py-1 text-center text-xs font-bold text-white"
                  style={{ background: SKILL_ACCENT_COLOR[t.skill] }}
                >
                  {t.code}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] leading-tight font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.frequencyTier ? FREQUENCY_TIER_LABEL[t.frequencyTier] : ""} ·{" "}
                    {t.practicedCount > 0 ? `đã làm ${t.practicedCount}/${t.totalCount}` : "chưa làm"}
                  </p>
                </div>
                <Link href={`/practice/${t.skill}/${t.id}`} className="shrink-0 text-[13px] font-semibold text-primary">
                  Luyện →
                </Link>
              </li>
            ))}
            {todo.length === 0 && (
              <li className="flex items-center gap-2 rounded-lg bg-card p-2.5 text-[13px] text-muted-foreground shadow-sm">
                <Target className="size-3.5 shrink-0" /> Đã hoàn thành hết các dạng bài trọng tâm!
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
