import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardOverviewHeader } from "@/components/dashboard/dashboard-overview-header";
import { OverviewStatsRow } from "@/components/dashboard/overview-stats-row";
import { StartPracticeGrid } from "@/components/dashboard/start-practice-grid";
import { MocktestBanner } from "@/components/dashboard/mocktest-banner";
import { FeaturedPracticeCarousel } from "@/components/dashboard/featured-practice-carousel";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import {
  getDashboardOverview,
  getRecentAttempts,
  getQuestionCountsByType,
  getSkillProgress,
  checkAndMarkWelcomeSeen,
  getUserAvatarUrl,
} from "@/lib/dashboard-queries";

const FEATURED_TYPE_IDS = ["write-from-dictation", "repeat-sentence", "reading-fill-blanks-dropdown"];

export default async function Home() {
  const session = await auth();
  const user = session!.user;

  const [overview, recentAttempts, featuredCounts, skillProgress, isReturningUser, avatarUrl] =
    await Promise.all([
      getDashboardOverview(user.id),
      getRecentAttempts(user.id),
      getQuestionCountsByType(FEATURED_TYPE_IDS),
      getSkillProgress(user.id),
      checkAndMarkWelcomeSeen(user.id),
      getUserAvatarUrl(user.id),
    ]);

  return (
    <AppShell>
      <div className="mx-auto flex max-w-[1100px] flex-col gap-10 px-5 py-8 sm:px-10">
        <DashboardOverviewHeader
          name={user.name ?? user.email ?? "Học viên"}
          examPackage={user.examPackage}
          avatarUrl={avatarUrl}
          overview={overview}
          isReturningUser={isReturningUser}
        />
        <OverviewStatsRow overview={overview} />
        <FeaturedPracticeCarousel counts={featuredCounts} />
        <div className="pt-4">
          <StartPracticeGrid progress={skillProgress} />
        </div>
        <MocktestBanner />
        <RecentActivity attempts={recentAttempts} />
      </div>
    </AppShell>
  );
}
