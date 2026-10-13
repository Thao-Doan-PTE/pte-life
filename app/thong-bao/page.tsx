import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { RailShell } from "@/components/home/rail-shell";
import { StageCard } from "@/components/home/stage-intro";
import { hasRole, hasAnyRole } from "@/lib/auth-helpers";
import { getUserAvatarUrl } from "@/lib/dashboard-queries";
import { getActiveClassInfo } from "@/lib/student-overview-queries";
import { hasTuTrialAccess } from "@/lib/student-access";

export default async function ThongBaoPage() {
  const session = await auth();
  const user = session?.user;

  if (!user) redirect("/login?callbackUrl=/thong-bao");
  if (!hasRole(user, "STUDENT")) {
    if (hasAnyRole(user, ["ADMIN", "OPS", "ACADEMIC_LEAD"])) redirect("/admin");
    if (hasRole(user, "TEACHER")) redirect("/admin/classes");
  }

  const [avatarUrl, classInfo] = await Promise.all([getUserAvatarUrl(user.id), getActiveClassInfo(user.id)]);
  // Chưa có lớp: mở mục "Luyện đề Tủ" nếu nằm trong danh sách mời dùng thử.
  const hasTuAccess = classInfo !== null || (await hasTuTrialAccess(user.id));

  return (
    <RailShell
      role="student"
      headline={<>Thông báo</>}
      user={{ name: user.name ?? user.email ?? "Học viên", avatarUrl }}
      hasActiveClass={classInfo !== null}
      hasTuAccess={hasTuAccess}
    >
      <div className="flex flex-col gap-5">
        <div>
          <p className="m-0 text-[13px] font-bold tracking-[0.12em] uppercase" style={{ color: "var(--rail-red)" }}>
            Hệ thống
          </p>
          <h2 className="mt-2.5 mb-1.5 text-[clamp(24px,2.8vw,34px)] leading-[1.15] font-bold text-balance" style={{ color: "var(--rail-charcoal)" }}>
            Thông báo
          </h2>
        </div>
        <StageCard>
          <p className="m-0" style={{ color: "var(--rail-ink-dim)" }}>
            Tính năng thông báo đang được xây dựng. Khi ra mắt, bạn sẽ thấy ở đây các cập nhật về lớp học, bài được
            giao và lịch học sắp tới.
          </p>
        </StageCard>
      </div>
    </RailShell>
  );
}
