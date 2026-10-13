import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminContent, AdminPageHeader, Kpi } from "@/components/admin/admin-ui";
import { EntryTestAnswerSections } from "@/components/admin/entry-tests/entry-test-answer-sections";
import {
  AttemptInfoPanel,
  LeadPanel,
  TakerPanel,
  UserConsultationsPanel,
} from "@/components/admin/entry-tests/entry-test-info-panels";
import { can, getScopedClassIdsFor, requireAdminPage } from "@/lib/admin/permissions";
import { formatVnDate, formatVnDateTime } from "@/lib/admin/student-status";
import { ENTRY_TEST_SCALE, getEntryTestAttemptDetail } from "@/lib/admin/entry-test-admin-queries";

/** Chi tiết 1 lượt Test đầu vào (chỉ xem) cho CSKH / học thuật / giáo viên rà bài
 * trong giai đoạn thử nghiệm. Quyền viewEntryTests; giáo viên thuần chỉ xem người
 * làm test đang học ở lớp mình (cùng điều kiện với danh sách) — ngoài phạm vi
 * hoặc lượt chưa nộp → 404. SĐT, yêu cầu tư vấn và link hồ sơ chỉ cho người có
 * quyền viewStudents. Chưa có thao tác chấm (thang điểm còn chờ quyết định). */
export default async function AdminEntryTestDetailPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const user = await requireAdminPage("viewEntryTests");
  const { attemptId } = await params;
  const scopedClassIds = await getScopedClassIdsFor(user, "viewEntryTests");
  const canViewStudents = can(user, "viewStudents");

  const detail = await getEntryTestAttemptDetail({ attemptId, scopedClassIds, includeContact: canViewStudents });
  if (!detail) notFound();

  const auto = detail.scoreAuto ?? 0;
  const pct = ENTRY_TEST_SCALE.autoMax > 0 ? Math.round((auto / ENTRY_TEST_SCALE.autoMax) * 100) : 0;
  const teacherNames = ENTRY_TEST_SCALE.teacherSections.map((s) => s.name).join(" / ") || "Speaking / Listening";
  const teacherMax = ENTRY_TEST_SCALE.teacherSections.reduce((sum, s) => sum + s.max, 0);
  const autoNames = ENTRY_TEST_SCALE.autoSections.map((s) => s.name).join(" + ");
  const graded = detail.status === "GRADED";

  return (
    <>
      <AdminPageHeader
        title={detail.user.name}
        sub={`Test đầu vào · ${detail.submittedAt ? `nộp ${formatVnDateTime(detail.submittedAt)}` : "chưa nộp"} · chỉ xem`}
        actions={
          <Link href="/admin/entry-tests" className="adm-btn adm-btn-sm adm-btn-ghost">
            <ArrowLeft className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Danh sách test</span>
            <span className="sr-only sm:hidden">Về danh sách test đầu vào</span>
          </Link>
        }
      />
      <AdminContent>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi
            label="Điểm tự chấm"
            value={
              <>
                {detail.scoreAuto ?? "—"}
                <span className="text-[16px] font-normal" style={{ color: "var(--adm-ink-3)" }}>
                  /{ENTRY_TEST_SCALE.autoMax}
                </span>
              </>
            }
            hint={detail.scoreAuto != null ? `${pct}% · ${autoNames}` : autoNames}
          />
          <Kpi
            label="Trình độ tạm xếp"
            value={<span className="text-[17px] leading-snug sm:text-[20px]">{detail.level ?? "—"}</span>}
            hint="Theo % phần tự chấm · ngưỡng chờ duyệt"
          />
          <Kpi
            label={teacherNames}
            value={<span className="text-[17px] leading-snug sm:text-[20px]">{graded ? "Đã chấm" : "Chờ chấm"}</span>}
            hint={
              graded && detail.scoreTotal != null
                ? `Tổng ${detail.scoreTotal}/${ENTRY_TEST_SCALE.totalMax}`
                : `Giáo viên chấm tay · ${teacherMax} điểm`
            }
          />
          <Kpi
            label="Ngày nộp"
            value={
              <span className="text-[17px] leading-snug sm:text-[20px]">
                {detail.submittedAt ? formatVnDate(detail.submittedAt) : "—"}
              </span>
            }
            hint={detail.autoSubmitted ? "Tự nộp khi hết giờ" : "Người làm test bấm nộp"}
          />
        </div>

        <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--adm-ink-3)" }}>
          Thang điểm thô {ENTRY_TEST_SCALE.totalMax} của đề hiện tại (không phải thang PTE 10–90). Đáp án và ngưỡng xếp
          trình độ là đề xuất, chưa được học thuật duyệt; {teacherNames} chờ giáo viên chấm.
        </p>

        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          {/* Thông tin người làm test — đứng trước trên màn hẹp, cột phải trên màn rộng. */}
          <div className="flex min-w-0 flex-col gap-5 xl:col-start-2 xl:row-start-1">
            <TakerPanel detail={detail} canViewStudents={canViewStudents} />
            <AttemptInfoPanel detail={detail} />
            <LeadPanel detail={detail} canViewStudents={canViewStudents} />
            {detail.consultations && <UserConsultationsPanel rows={detail.consultations} />}
          </div>

          <div className="flex min-w-0 flex-col gap-5 xl:col-start-1 xl:row-start-1">
            <EntryTestAnswerSections sections={detail.sections} />
          </div>
        </div>
      </AdminContent>
    </>
  );
}
