import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { RailShell } from "@/components/home/rail-shell";
import { StageCard } from "@/components/home/stage-intro";
import { hasRole, hasAnyRole } from "@/lib/auth-helpers";
import { getUserAvatarUrl } from "@/lib/dashboard-queries";
import { getActiveClassInfo } from "@/lib/student-overview-queries";

export default async function LopHocPage() {
  const session = await auth();
  const user = session?.user;

  if (!user) redirect("/login?callbackUrl=/lop-hoc");
  if (!hasRole(user, "STUDENT")) {
    if (hasAnyRole(user, ["ADMIN", "OPS", "ACADEMIC_LEAD"])) redirect("/admin");
    if (hasRole(user, "TEACHER")) redirect("/admin/classes");
  }

  const [avatarUrl, classInfo] = await Promise.all([getUserAvatarUrl(user.id), getActiveClassInfo(user.id)]);
  if (!classInfo) redirect("/test-dau-vao");

  return (
    <RailShell
      role="student"
      headline={<>Lớp của tôi</>}
      user={{ name: user.name ?? user.email ?? "Học viên", avatarUrl }}
      hasActiveClass={classInfo !== null}
    >
      <div className="flex flex-col gap-5">
        <div>
          <p className="m-0 text-[13px] font-bold tracking-[0.12em] uppercase" style={{ color: "var(--rail-red)" }}>
            Lớp học
          </p>
          <h2 className="mt-2.5 mb-1.5 text-[clamp(24px,2.8vw,34px)] leading-[1.15] font-bold text-balance" style={{ color: "var(--rail-charcoal)" }}>
            Lớp của tôi
          </h2>
        </div>

        {classInfo ? (
          <StageCard>
            <p className="m-0 text-[20px] font-bold" style={{ color: "var(--rail-charcoal)" }}>
              {classInfo.className}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {classInfo.targetScore != null && (
                <span className="inline-flex items-center rounded-full px-3 py-1 text-[13px] font-bold" style={{ background: "var(--rail-red-tint)", color: "var(--rail-red-text)" }}>
                  🎯 Mục tiêu {classInfo.targetScore}+
                </span>
              )}
              {classInfo.schedule && (
                <span className="inline-flex items-center rounded-full px-3 py-1 text-[13px] font-bold" style={{ background: "var(--rail-surface)", color: "var(--rail-ink)" }}>
                  🕐 {classInfo.schedule}
                </span>
              )}
              <span className="inline-flex items-center rounded-full px-3 py-1 text-[13px] font-bold" style={{ background: "var(--rail-surface)", color: "var(--rail-ink)" }}>
                {classInfo.examType === "academic" ? "PTE Academic" : "PTE Core"}
              </span>
            </div>
            <p className="mt-4 mb-0 text-[15px]" style={{ color: "var(--rail-ink-dim)" }}>
              {classInfo.teacherName ? `Giáo viên phụ trách: ${classInfo.teacherName}` : "Chưa có giáo viên phụ trách"}
            </p>
          </StageCard>
        ) : (
          <StageCard>
            <p className="m-0" style={{ color: "var(--rail-ink-dim)" }}>
              Bạn chưa được xếp vào lớp nào. Liên hệ PTE-Life để được tư vấn lộ trình và lớp phù hợp.
            </p>
          </StageCard>
        )}
      </div>
    </RailShell>
  );
}
