import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { RailShell } from "@/components/home/rail-shell";
import { StageCard } from "@/components/home/stage-intro";
import { ClassWeekStrip, ClassScheduleList } from "@/components/home/class-schedule-panel";
import { hasRole, hasAnyRole } from "@/lib/auth-helpers";
import { getUserAvatarUrl } from "@/lib/dashboard-queries";
import { getActiveClassInfo, getClassWeekSchedule } from "@/lib/student-overview-queries";

export default async function LichHocPage() {
  const session = await auth();
  const user = session?.user;

  if (!user) redirect("/login?callbackUrl=/lich-hoc");
  if (!hasRole(user, "STUDENT")) {
    if (hasAnyRole(user, ["ADMIN", "OPS", "ACADEMIC_LEAD"])) redirect("/admin");
    if (hasRole(user, "TEACHER")) redirect("/admin/classes");
  }

  const [avatarUrl, classInfo] = await Promise.all([getUserAvatarUrl(user.id), getActiveClassInfo(user.id)]);
  if (!classInfo) redirect("/test-dau-vao");
  const weekSchedule = getClassWeekSchedule(classInfo?.schedule ?? null);

  return (
    <RailShell
      role="student"
      headline={<>Lịch học</>}
      user={{ name: user.name ?? user.email ?? "Học viên", avatarUrl }}
      hasActiveClass={classInfo !== null}
    >
      <div className="flex flex-col gap-5">
        <div>
          <p className="m-0 text-[13px] font-bold tracking-[0.12em] uppercase" style={{ color: "var(--rail-red)" }}>
            Lớp học
          </p>
          <h2 className="mt-2.5 mb-1.5 text-[clamp(24px,2.8vw,34px)] leading-[1.15] font-bold text-balance" style={{ color: "var(--rail-charcoal)" }}>
            Lịch học
          </h2>
        </div>

        {weekSchedule.length > 0 ? (
          <StageCard>
            <p className="m-0 mb-3.5 text-[13px] font-bold tracking-wide uppercase" style={{ color: "var(--rail-ink-dim)" }}>
              Tuần này
            </p>
            <div className="mb-4">
              <ClassWeekStrip sessions={weekSchedule} />
            </div>
            <ClassScheduleList sessions={weekSchedule} />
          </StageCard>
        ) : (
          <StageCard>
            <p className="m-0" style={{ color: "var(--rail-ink-dim)" }}>
              {classInfo
                ? "Chưa đọc được lịch học từ thông tin lớp. Liên hệ giáo viên hoặc PTE-Life để kiểm tra lại."
                : "Bạn chưa được xếp vào lớp nào nên chưa có lịch học."}
            </p>
          </StageCard>
        )}
      </div>
    </RailShell>
  );
}
