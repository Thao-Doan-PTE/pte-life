import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { RailShell } from "@/components/home/rail-shell";
import { StageCard } from "@/components/home/stage-intro";
import { hasRole, hasAnyRole } from "@/lib/auth-helpers";
import { getUserAvatarUrl } from "@/lib/dashboard-queries";

export default async function BaiChoChamPage() {
  const session = await auth();
  const user = session?.user;

  if (!user) redirect("/login?callbackUrl=/bai-cho-cham");
  if (hasRole(user, "STUDENT")) redirect("/");
  if (hasAnyRole(user, ["ADMIN", "OPS", "ACADEMIC_LEAD"])) redirect("/admin");
  if (!hasRole(user, "TEACHER")) redirect("/");

  const avatarUrl = await getUserAvatarUrl(user.id);

  return (
    <RailShell
      role="teacher"
      headline={<>Chào <strong className="font-semibold">{user.name ?? user.email ?? "bạn"}</strong></>}
      user={{ name: user.name ?? user.email ?? "Giáo viên", avatarUrl }}
    >
      <p className="m-0 text-[13px] font-bold tracking-[0.12em] uppercase" style={{ color: "var(--rail-red)" }}>
        Bài chờ chấm
      </p>
      <h2 className="mt-2.5 mb-6 text-[clamp(24px,2.8vw,34px)] leading-[1.15] font-bold text-balance" style={{ color: "var(--rail-charcoal)" }}>
        AI ước lượng trước, giáo viên chốt điểm
      </h2>
      <StageCard>
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <b className="text-[16px]" style={{ color: "var(--rail-charcoal)" }}>
            Danh sách bài học viên đã nộp
          </b>
          <span className="px-2 py-0.5 text-xs font-semibold tracking-wide uppercase" style={{ background: "var(--rail-surface)", color: "var(--rail-ink-dim)" }}>
            Sắp ra mắt
          </span>
        </div>
        <p className="m-0" style={{ color: "var(--rail-ink-dim)" }}>
          Tính năng chấm bài (xem điểm AI ước lượng trước, chốt điểm và nhận xét cho học viên) đang được xây dựng.
          Bạn sẽ thấy danh sách bài chờ chấm theo lớp ở đây khi tính năng ra mắt.
        </p>
      </StageCard>
    </RailShell>
  );
}
