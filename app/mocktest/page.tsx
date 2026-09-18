import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { QuestionTestCard } from "@/components/mocktest/question-test-card";
import { SectionTestCard } from "@/components/mocktest/section-test-card";
import { FullTestCard } from "@/components/mocktest/full-test-card";
import { MocktestStatsCards } from "@/components/mocktest/mocktest-stats-cards";
import { MocktestHistoryList } from "@/components/mocktest/mocktest-history-list";
import { getMockTestHistory, getMockTestStats } from "@/lib/mocktest-queries";

export default async function MocktestPage() {
  const session = await auth();
  const userId = session!.user.id;
  const examPackage = session!.user.examPackage;

  const [stats, history] = await Promise.all([
    getMockTestStats(userId),
    getMockTestHistory(userId),
  ]);

  return (
    <AppShell>
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-5 py-6 sm:px-10">
        <div className="rounded-xl bg-primary px-6 py-6 text-primary-foreground">
          <h1 className="text-xl font-semibold">Mocktest</h1>
          <p className="text-sm text-primary-foreground/90">
            Làm bài thi mô phỏng PTE Academic &amp; PTE Core theo cấu trúc thật.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <QuestionTestCard examPackage={examPackage} />
          <SectionTestCard />
          <FullTestCard />
        </div>

        <MocktestStatsCards
          totalCompleted={stats.totalCompleted}
          averageScorePct={stats.averageScorePct}
        />

        <div>
          <h2 className="mb-3 text-lg font-semibold">Bài test đã làm</h2>
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
    </AppShell>
  );
}
