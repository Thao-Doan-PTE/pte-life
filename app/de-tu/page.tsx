import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { RailShell } from "@/components/home/rail-shell";
import { GuestTuView } from "@/components/home/guest-tu-view";
import { TuOverviewView } from "@/components/home/tu-overview-view";
import { hasRole, hasAnyRole } from "@/lib/auth-helpers";
import { getUserAvatarUrl } from "@/lib/dashboard-queries";
import { getActiveClassInfo } from "@/lib/student-overview-queries";
import { getTuOverview, getTuQuickReportStats } from "@/lib/tu-queries";
import { isTuTrialActive } from "@/lib/student-access";
import { prisma } from "@/lib/prisma";

export default async function DeTuPage() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return (
      <RailShell role="guest" headline={<>Chào mừng bạn đến với <strong className="font-semibold">PTE-Life</strong></>} user={null}>
        <GuestTuView />
      </RailShell>
    );
  }

  if (!hasRole(user, "STUDENT")) {
    if (hasAnyRole(user, ["ADMIN", "OPS", "ACADEMIC_LEAD"])) redirect("/admin");
    if (hasRole(user, "TEACHER")) redirect("/admin/classes");
  }

  const [avatarUrl, classInfo, overview, stats] = await Promise.all([
    getUserAvatarUrl(user.id),
    getActiveClassInfo(user.id),
    getTuOverview(user.id),
    getTuQuickReportStats(user.id),
  ]);

  // Học viên có lớp, hoặc tài khoản trong danh sách mời dùng thử Tủ (hiện ngày hết hạn dùng thử).
  const trialRow = classInfo ? null : await prisma.user.findUnique({ where: { id: user.id }, select: { tuTrialUntil: true } });
  const tuTrial = !classInfo && isTuTrialActive(trialRow?.tuTrialUntil);
  if (!classInfo && !tuTrial) redirect("/test-dau-vao");

  return (
    <RailShell
      role="student"
      headline={<>Chào <strong className="font-semibold">{user.name ?? user.email ?? "bạn"}</strong></>}
      user={{ name: user.name ?? user.email ?? "Học viên", avatarUrl }}
      hasActiveClass={classInfo !== null}
      hasTuAccess={classInfo !== null || tuTrial}
    >
      <TuOverviewView overview={overview} stats={stats} trialUntil={tuTrial && trialRow?.tuTrialUntil ? trialRow.tuTrialUntil.toISOString() : null} />
    </RailShell>
  );
}
