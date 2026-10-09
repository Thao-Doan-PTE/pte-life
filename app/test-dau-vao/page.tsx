import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { RailShell } from "@/components/home/rail-shell";
import { GuestTestView } from "@/components/home/guest-test-view";
import { hasRole, hasAnyRole } from "@/lib/auth-helpers";
import { getUserAvatarUrl } from "@/lib/dashboard-queries";
import { getActiveClassInfo } from "@/lib/student-overview-queries";
import { getLatestEntryTestAttempt, getEntryTestResultDetail } from "@/lib/entry-test-queries";
import { getOrCreateEntryTestAttempt } from "@/lib/actions/entry-test-attempt";
import { EntryTestShell } from "@/components/entry-test/entry-test-shell";
import { EntryTestResult } from "@/components/entry-test/entry-test-result";
import { EntryTestRetakeButton } from "@/components/entry-test/entry-test-retake-button";

export default async function TestDauVaoPage() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return (
      <RailShell role="guest" headline={<>Chào mừng bạn đến với <strong className="font-semibold">PTE-Life</strong></>} user={null}>
        <GuestTestView />
      </RailShell>
    );
  }

  if (!hasRole(user, "STUDENT")) {
    if (hasAnyRole(user, ["ADMIN", "OPS", "ACADEMIC_LEAD"])) redirect("/admin");
    if (hasRole(user, "TEACHER")) redirect("/admin/classes");
  }

  const [avatarUrl, classInfo] = await Promise.all([getUserAvatarUrl(user.id), getActiveClassInfo(user.id)]);
  const hasActiveClass = classInfo !== null;

  let content;
  if (hasActiveClass) {
    content = (
      <div className="max-w-xl px-6 py-10 sm:px-8 sm:py-12">
        <h2 className="m-0 mb-2 text-[clamp(22px,2.6vw,28px)] leading-[1.15] font-bold" style={{ color: "var(--rail-charcoal)" }}>
          Test đầu vào không áp dụng cho lớp bạn đang học
        </h2>
        <p className="m-0" style={{ color: "var(--rail-ink-dim)" }}>
          Test đầu vào chỉ dành cho học viên mới hoặc chưa được xếp lớp, dùng để đánh giá trình độ trước khi tư vấn
          khóa học. Bạn đã là học viên của lớp <b style={{ color: "var(--rail-charcoal)" }}>{classInfo.className}</b> — nếu
          cần đánh giá lại trình độ, hãy liên hệ giáo viên phụ trách lớp để được sắp xếp.
        </p>
      </div>
    );
  } else {
    const latest = await getLatestEntryTestAttempt(user.id);
    if (!latest || latest.status === "IN_PROGRESS") {
      const attempt = await getOrCreateEntryTestAttempt();
      if ("error" in attempt) {
        content = (
          <p className="px-6 py-10 sm:px-8 sm:py-12" style={{ color: "var(--rail-red-text)" }}>
            {attempt.error}
          </p>
        );
      } else {
        content = <EntryTestShell attemptId={attempt.id} defaultName={user.name ?? undefined} defaultEmail={user.email ?? undefined} />;
      }
    } else {
      const detail = await getEntryTestResultDetail(latest.id);
      content = detail ? (
        <div className="flex flex-col gap-5 px-6 py-10 sm:px-8 sm:py-12">
          <EntryTestResult
            summary={detail.summary}
            rows={detail.rows}
            autoSubmitted={detail.autoSubmitted}
            durationUsedSec={detail.durationUsedSec}
            defaultName={user.name ?? undefined}
            defaultEmail={user.email ?? undefined}
          />
          <EntryTestRetakeButton />
        </div>
      ) : (
        <p className="px-6 py-10 sm:px-8 sm:py-12" style={{ color: "var(--rail-ink-dim)" }}>
          Không tìm thấy kết quả bài làm.
        </p>
      );
    }
  }

  return (
    <RailShell
      role="student"
      headline={<>Chào <strong className="font-semibold">{user.name ?? user.email ?? "bạn"}</strong></>}
      user={{ name: user.name ?? user.email ?? "Học viên", avatarUrl }}
      hasActiveClass={hasActiveClass}
      fullBleed
    >
      {content}
    </RailShell>
  );
}
