import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { hasRole, hasAnyRole } from "@/lib/auth-helpers";
import { DashboardBreadcrumb } from "@/components/dashboard/dashboard-breadcrumb";
import { SkillProgressExplorer } from "@/components/dashboard/skill-progress-explorer";
import { QuickReport } from "@/components/dashboard/quick-report";
import { MocktestBanner } from "@/components/dashboard/mocktest-banner";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { PracticeQuickLaunch } from "@/components/dashboard/practice-quick-launch";
import { getRecentAttempts, getSkillProgress } from "@/lib/dashboard-queries";
import { getLastPracticedType } from "@/lib/practice-quicklaunch-queries";
import { getTypeProgressForPackage } from "@/lib/skill-progress-queries";
import { getQuickReportStats } from "@/lib/quick-report-queries";
import { getActiveClassInfo } from "@/lib/student-overview-queries";

export default async function LuyenDePtePage() {
  const session = await auth();
  const user = session?.user;

  if (!user) redirect("/login?callbackUrl=/luyen-de-pte");

  if (!hasRole(user, "STUDENT")) {
    if (hasAnyRole(user, ["ADMIN", "OPS", "ACADEMIC_LEAD"])) redirect("/admin");
    if (hasRole(user, "TEACHER")) redirect("/admin/classes");
  }

  const [recentAttempts, typeProgress, lastPracticed, skillProgress, quickStats, classInfo] = await Promise.all([
    getRecentAttempts(user.id),
    getTypeProgressForPackage(user.id, user.examPackage),
    getLastPracticedType(user.id),
    getSkillProgress(user.id),
    getQuickReportStats(user.id),
    getActiveClassInfo(user.id),
  ]);

  if (!classInfo) redirect("/test-dau-vao");

  return (
    <AppShell>
      <div className="min-h-full bg-white dark:bg-background">
        <DashboardBreadcrumb current="Luyện đề PTE" widthClass="max-w-5xl" />
        <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 pt-4 pb-8">
          <QuickReport
            skillProgress={skillProgress}
            typeProgress={typeProgress}
            stats={quickStats}
            targetScore={classInfo?.targetScore ?? null}
            resume={lastPracticed}
          />
          <div id="chon-ky-nang">
            <PracticeQuickLaunch examPackage={user.examPackage} />
          </div>
          <MocktestBanner />
          <div className="pt-4">
            <SkillProgressExplorer types={typeProgress} />
          </div>
          <RecentActivity attempts={recentAttempts} />
        </div>
      </div>
    </AppShell>
  );
}
