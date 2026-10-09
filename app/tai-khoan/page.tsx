import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { RailShell } from "@/components/home/rail-shell";
import { StageCard } from "@/components/home/stage-intro";
import { AccountAvatarUpload } from "@/components/home/account-avatar-upload";
import { hasRole, hasAnyRole } from "@/lib/auth-helpers";
import { getUserAvatarUrl } from "@/lib/dashboard-queries";
import { getActiveClassInfo } from "@/lib/student-overview-queries";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5" style={{ borderBottom: "1px solid var(--rail-line)" }}>
      <span className="text-[15px]" style={{ color: "var(--rail-ink-dim)" }}>
        {label}
      </span>
      <span className="text-[15px] font-semibold" style={{ color: "var(--rail-charcoal)" }}>
        {value}
      </span>
    </div>
  );
}

export default async function TaiKhoanPage() {
  const session = await auth();
  const user = session?.user;

  if (!user) redirect("/login?callbackUrl=/tai-khoan");
  if (!hasRole(user, "STUDENT")) {
    if (hasAnyRole(user, ["ADMIN", "OPS", "ACADEMIC_LEAD"])) redirect("/admin");
    if (hasRole(user, "TEACHER")) redirect("/admin/classes");
  }

  const [avatarUrl, classInfo] = await Promise.all([getUserAvatarUrl(user.id), getActiveClassInfo(user.id)]);
  const expiresAtLabel = new Date(user.expiresAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <RailShell
      role="student"
      headline={<>Hồ sơ & cài đặt</>}
      user={{ name: user.name ?? user.email ?? "Học viên", avatarUrl }}
      hasActiveClass={classInfo !== null}
    >
      <div className="flex flex-col gap-5">
        <div>
          <p className="m-0 text-[13px] font-bold tracking-[0.12em] uppercase" style={{ color: "var(--rail-red)" }}>
            Hệ thống
          </p>
          <h2 className="mt-2.5 mb-1.5 text-[clamp(24px,2.8vw,34px)] leading-[1.15] font-bold text-balance" style={{ color: "var(--rail-charcoal)" }}>
            Hồ sơ & cài đặt
          </h2>
        </div>

        <StageCard>
          <p className="m-0 mb-3 text-[13px] font-bold tracking-wide uppercase" style={{ color: "var(--rail-ink-dim)" }}>
            Ảnh đại diện
          </p>
          <AccountAvatarUpload name={user.name ?? user.email ?? "Học viên"} avatarUrl={avatarUrl} />
        </StageCard>

        <StageCard>
          <p className="m-0 mb-1 text-[13px] font-bold tracking-wide uppercase" style={{ color: "var(--rail-ink-dim)" }}>
            Thông tin tài khoản
          </p>
          <InfoRow label="Họ tên" value={user.name ?? "—"} />
          <InfoRow label="Email" value={user.email ?? "—"} />
          {classInfo ? (
            <>
              <InfoRow label="Gói học" value={user.examPackage === "academic" ? "PTE Academic / UKVI" : "PTE Core"} />
              <InfoRow label="Hạn sử dụng" value={expiresAtLabel} />
              <InfoRow label="Lượt bảo lưu còn lại" value={String(user.reservationsLeft)} />
            </>
          ) : (
            <>
              <InfoRow label="Loại tài khoản" value="Đăng ký làm test đầu vào" />
              <InfoRow label="Trạng thái" value="Chưa là học viên PTE-Life" />
            </>
          )}
        </StageCard>
      </div>
    </RailShell>
  );
}
