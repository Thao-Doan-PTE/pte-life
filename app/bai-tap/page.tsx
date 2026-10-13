import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { RailShell } from "@/components/home/rail-shell";
import { StageCard } from "@/components/home/stage-intro";
import { AssignmentCard } from "@/components/home/assignments/assignment-card";
import { hasRole } from "@/lib/auth-helpers";
import { can, isStaff } from "@/lib/admin/permissions";
import { getUserAvatarUrl } from "@/lib/dashboard-queries";
import { getActiveClassInfo } from "@/lib/student-overview-queries";
import { getStudentAssignments } from "@/lib/student-assignment-queries";

/** "Bài giáo viên giao" của học viên đang học 1 lớp. Nhân viên được chuyển sang
 * trang Giao bài tập trong Admin; học viên chưa xếp lớp về Test đầu vào (giống
 * requireClassStudent). */
export default async function BaiTapPage() {
  const session = await auth();
  const user = session?.user;

  if (!user) redirect("/login?callbackUrl=/bai-tap");
  if (!hasRole(user, "STUDENT")) {
    if (isStaff(user)) redirect(can(user, "manageAssignments") ? "/admin/assignments" : "/admin");
    redirect("/");
  }

  const [avatarUrl, classInfo] = await Promise.all([getUserAvatarUrl(user.id), getActiveClassInfo(user.id)]);
  if (!classInfo) redirect("/test-dau-vao");

  const assignments = await getStudentAssignments(user.id);
  const open = assignments.filter((a) => a.status === "OPEN");
  const closed = assignments.filter((a) => a.status === "CLOSED");
  const todoCount = open.reduce((sum, a) => sum + (a.totalCount - a.submittedCount), 0);

  return (
    <RailShell
      role="student"
      headline={<>Bài giáo viên giao</>}
      user={{ name: user.name ?? user.email ?? "Học viên", avatarUrl }}
      hasActiveClass
    >
      <div className="flex flex-col gap-5">
        <div>
          <p className="m-0 text-[13px] font-bold tracking-[0.12em] uppercase" style={{ color: "var(--rail-red)" }}>
            Lớp học
          </p>
          <h2 className="mt-2.5 mb-1.5 text-[clamp(24px,2.8vw,34px)] leading-[1.15] font-bold text-balance" style={{ color: "var(--rail-charcoal)" }}>
            Bài giáo viên giao
          </h2>
          <p className="m-0 text-[15px]" style={{ color: "var(--rail-ink-dim)" }}>
            {open.length > 0
              ? `${open.length} bài đang mở${todoCount > 0 ? ` · còn ${todoCount} câu chưa làm` : " · bạn đã nộp đủ"}. Lần nộp đầu tiên của mỗi câu được tính là bài nộp; làm lại sau đó là tự luyện.`
              : "Bài tập giáo viên lớp bạn giao sẽ hiện ở đây, kèm hạn nộp, điểm và nhận xét."}
          </p>
        </div>

        {assignments.length === 0 ? (
          <StageCard>
            <p className="m-0 text-[16px] font-bold" style={{ color: "var(--rail-charcoal)" }}>
              Chưa có bài tập nào được giao
            </p>
            <p className="mt-1.5 mb-0" style={{ color: "var(--rail-ink-dim)" }}>
              Khi giáo viên lớp {classInfo.className} giao bài, bạn sẽ thấy danh sách câu cần làm và hạn nộp ở đây.
            </p>
          </StageCard>
        ) : (
          <>
            {open.length > 0 && (
              <div className="flex flex-col gap-4">
                {open.map((a) => (
                  <AssignmentCard key={a.id} assignment={a} />
                ))}
              </div>
            )}

            {closed.length > 0 && (
              <div className="flex flex-col gap-4">
                <h3 className="m-0 mt-2 text-[17px] font-bold" style={{ color: "var(--rail-charcoal)" }}>
                  Đã đóng gần đây
                </h3>
                {closed.map((a) => (
                  <AssignmentCard key={a.id} assignment={a} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </RailShell>
  );
}
