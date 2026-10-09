import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { RailShell } from "@/components/home/rail-shell";
import { GuestPracticeView } from "@/components/home/guest-practice-view";
import { StudentOverviewView } from "@/components/home/student-overview-view";
import { NewAccountOverview } from "@/components/home/new-account-overview";
import { getLatestEntryTestAttempt } from "@/lib/entry-test-queries";
import { TeacherOverviewView } from "@/components/home/teacher-overview-view";
import { hasRole, hasAnyRole } from "@/lib/auth-helpers";
import { getSkillProgress, getUserAvatarUrl, getRecentAttempts } from "@/lib/dashboard-queries";
import { getActiveClassInfo, getResumeSession, getClassWeekSchedule } from "@/lib/student-overview-queries";
import { getClassesForCurrentUser } from "@/lib/actions/classes";
import { getWeeklyActivityStats } from "@/lib/overview-activity-queries";
import { getTypeProgressForPackage } from "@/lib/skill-progress-queries";
import { getStreakDays } from "@/lib/wfd-queries";
import { getTuOverview } from "@/lib/tu-queries";

export default async function Home() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return (
      <RailShell role="guest" headline={<>Chào mừng bạn đến với <strong className="font-semibold">PTE-Life</strong></>} user={null}>
        <GuestPracticeView />
      </RailShell>
    );
  }

  if (!hasRole(user, "STUDENT")) {
    if (hasAnyRole(user, ["ADMIN", "OPS", "ACADEMIC_LEAD"])) redirect("/admin");

    if (hasRole(user, "TEACHER")) {
      const avatarUrl = await getUserAvatarUrl(user.id);
      const classes = await getClassesForCurrentUser();
      return (
        <RailShell
          role="teacher"
          headline={<>Chào <strong className="font-semibold">{user.name ?? user.email ?? "bạn"}</strong></>}
          user={{ name: user.name ?? user.email ?? "Giáo viên", avatarUrl }}
        >
          <TeacherOverviewView
            classes={classes.map((c) => ({
              id: c.id,
              name: c.name,
              examType: c.examType,
              schedule: c.schedule,
              studentCount: c._count.enrollments,
            }))}
          />
        </RailShell>
      );
    }
  }

  const [earlyClassInfo, earlyAvatarUrl] = await Promise.all([getActiveClassInfo(user.id), getUserAvatarUrl(user.id)]);
  if (!earlyClassInfo) {
    const latestTest = await getLatestEntryTestAttempt(user.id);
    const testStatus = !latestTest ? "none" : latestTest.status === "IN_PROGRESS" ? "in_progress" : "submitted";
    return (
      <RailShell
        role="student"
        headline={<>Chào <strong className="font-semibold">{user.name ?? user.email ?? "bạn"}</strong></>}
        user={{ name: user.name ?? user.email ?? "Học viên", avatarUrl: earlyAvatarUrl }}
        hasActiveClass={false}
        fullBleed
      >
        <div className="hover-lift-group px-6 py-10 sm:px-8 sm:py-12">
          <NewAccountOverview name={user.name ?? user.email ?? "bạn"} email={user.email ?? ""} testStatus={testStatus} />
        </div>
      </RailShell>
    );
  }

  const [classInfo, resumeSession, skillProgress, avatarUrl, activity, streak, typeProgress, recentAttempts, tuOverview] = await Promise.all([
    getActiveClassInfo(user.id),
    getResumeSession(user.id),
    getSkillProgress(user.id),
    getUserAvatarUrl(user.id),
    getWeeklyActivityStats(user.id),
    getStreakDays(user.id),
    getTypeProgressForPackage(user.id, user.examPackage),
    getRecentAttempts(user.id, 1),
    getTuOverview(user.id),
  ]);

  const weekSchedule = getClassWeekSchedule(classInfo?.schedule ?? null);
  const practicedCount = typeProgress.reduce((sum, t) => sum + t.practicedCount, 0);
  const totalCount = typeProgress.reduce((sum, t) => sum + t.totalCount, 0);
  const lastPracticedAt = recentAttempts[0]?.attemptedAt ?? null;
  const tuPracticedCount = tuOverview.progress.reduce((sum, t) => sum + t.practicedCount, 0);
  const tuTotalCount = tuOverview.progress.reduce((sum, t) => sum + t.totalCount, 0);

  return (
    <RailShell
      role="student"
      headline={<>Chào <strong className="font-semibold">{user.name ?? user.email ?? "bạn"}</strong></>}
      user={{ name: user.name ?? user.email ?? "Học viên", avatarUrl }}
      hasActiveClass={classInfo !== null}
      fullBleed
    >
      <div className="hover-lift-group mx-auto max-w-[1240px] px-6 py-10 sm:px-8 sm:py-12">
        <StudentOverviewView
          classInfo={classInfo}
          weekSchedule={weekSchedule}
          resumeSession={resumeSession}
          skillProgress={skillProgress}
          activity={activity}
          streak={streak}
          examPackage={user.examPackage}
          practicedCount={practicedCount}
          totalCount={totalCount}
          lastPracticedAt={lastPracticedAt}
          tuPracticedCount={tuPracticedCount}
          tuTotalCount={tuTotalCount}
        />
      </div>
    </RailShell>
  );
}
