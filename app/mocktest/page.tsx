import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { WfdShell } from "@/components/wfd/wfd-shell";
import { DashboardBreadcrumb } from "@/components/dashboard/dashboard-breadcrumb";
import { MocktestWizard } from "@/components/mocktest/mocktest-wizard";
import { MocktestHero } from "@/components/mocktest/mocktest-hero";
import { MocktestQuickStats } from "@/components/mocktest/mocktest-summary";
import { MocktestResumeCard } from "@/components/mocktest/mocktest-resume-card";
import { MocktestHistoryList } from "@/components/mocktest/mocktest-history-list";
import {
  getMockTestHistory,
  getFullMockSummary,
  getWeakestQuestionType,
} from "@/lib/mocktest-queries";
import { getStreakDays } from "@/lib/wfd-queries";
import { requireClassStudent } from "@/lib/require-class-student";

export default async function MocktestPage() {
  // Chặn ở từng trang (không chỉ ở layout): khi chuyển trang phía trình duyệt,
  // Next.js có thể bỏ qua layout đã có sẵn.
  await requireClassStudent();
  const session = await auth();
  const userId = session!.user.id;
  const examPackage = session!.user.examPackage;

  const [history, fullMockSummary, weakestType, streakDays] = await Promise.all([
    getMockTestHistory(userId, 8),
    getFullMockSummary(userId),
    getWeakestQuestionType(userId),
    getStreakDays(userId),
  ]);

  const resumeSession = history.find((h) => h.status === "in_progress") ?? null;

  return (
    <AppShell>
      <WfdShell>
        <DashboardBreadcrumb items={[{ label: "Luyện đề PTE", href: "/luyen-de-pte" }]} current="Mock Test" widthClass="max-w-5xl" />
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 sm:gap-8 sm:px-10 sm:py-8">
          <div
            className="grid grid-cols-1 gap-3 rounded-2xl border p-3 shadow-sm sm:gap-5 sm:rounded-3xl sm:p-6 lg:grid-cols-[1fr_360px]"
            style={{
              background: "linear-gradient(135deg, #0D004D 0%, #241080 100%)",
              borderColor: "#0D004D",
            }}
          >
            <div>
              <MocktestHero />
              <MocktestQuickStats streakDays={streakDays} lastScore={fullMockSummary.lastScore} weakestType={weakestType} />
            </div>
            <MocktestResumeCard
              resumeSession={
                resumeSession
                  ? {
                      id: resumeSession.id,
                      mode: resumeSession.mode,
                      skill: resumeSession.skill,
                      questionTypeId: resumeSession.questionTypeId,
                      currentIndex: resumeSession.currentIndex,
                      totalQuestions: resumeSession.questionIds.length,
                      startedAt: resumeSession.startedAt.toISOString(),
                    }
                  : null
              }
            />
          </div>

          <div id="che-do">
            <MocktestWizard examPackage={examPackage} />
          </div>

          <div>
            <h2 className="mb-3 text-[20px] font-bold" style={{ color: "var(--wfd-ink)" }}>
              Bài test đã làm
            </h2>
            <MocktestHistoryList
              items={history.map((h) => ({
                id: h.id,
                mode: h.mode,
                skill: h.skill,
                questionTypeId: h.questionTypeId,
                status: h.status,
                scorePct: h.scorePct,
                startedAt: h.startedAt.toISOString(),
              }))}
            />
          </div>
        </div>
      </WfdShell>
    </AppShell>
  );
}
