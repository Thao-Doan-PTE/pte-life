import Link from "next/link";
import { AdminContent, AdminPageHeader, EmptyState, PersonCell, Pill } from "@/components/admin/admin-ui";
import { AiGradeBlock, AnswerBlock, PromptBlock } from "@/components/admin/grading/attempt-view";
import { GradeForm } from "@/components/admin/grading/grade-form";
import { GradingFilters } from "@/components/admin/grading/grading-filters";
import { GradingQueue } from "@/components/admin/grading/grading-queue";
import { FlashNotice } from "@/components/admin/grading/flash";
import { can, getScopedClassIdsFor, requireAdminPage } from "@/lib/admin/permissions";
import {
  getGradingDetail,
  getGradingFilterOptions,
  getGradingQueue,
  parseEntityId,
  type GradingDetail,
  type GradingFilters as Filters,
} from "@/lib/admin/grading-queries";
import { formatVnDateTime } from "@/lib/admin/student-status";

/** Chấm bài (HANDOFF §4.6). Admin / Trưởng học thuật chấm mọi lớp; Giáo viên (kể cả
 * kiêm vận hành) chỉ thấy và chấm bài của học viên trong lớp mình phụ trách (lọc trong truy vấn,
 * server action kiểm tra lại). Chỉ bài nộp trong bài tập được giao, thuộc dạng bài
 * có rubric, mới vào hàng chờ (quyết định 12A). */
export default async function AdminGradingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireAdminPage("gradeSubmissions");
  // Phạm vi theo quyền chấm bài: chỉ Admin / Trưởng học thuật chấm mọi lớp (OPS + TEACHER chỉ lớp mình).
  const classIds = await getScopedClassIdsFor(user, "gradeSubmissions");
  const canEditRubrics = can(user, "editRubrics");

  const sp = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  let classId = parseEntityId(first(sp.class));
  if (classId && classIds && !classIds.includes(classId)) classId = null;
  const filters: Filters = { assignmentId: parseEntityId(first(sp.assignment)), classId };
  const requestedId = parseEntityId(first(sp.attempt));

  const header = (
    <AdminPageHeader
      title="Chấm bài"
      sub={
        classIds
          ? "Bài Speaking/Writing của học viên lớp bạn phụ trách"
          : "Bài Speaking/Writing trong bài tập được giao, chờ giáo viên chấm"
      }
      actions={
        canEditRubrics ? (
          <Link href="/admin/grading/rubrics" className="adm-btn adm-btn-sm">
            Rubric chấm
          </Link>
        ) : undefined
      }
    />
  );

  if (classIds && classIds.length === 0) {
    return (
      <>
        {header}
        <AdminContent>
          <section className="adm-panel">
            <EmptyState>Bạn chưa được phân công lớp nào nên chưa có bài để chấm.</EmptyState>
          </section>
        </AdminContent>
      </>
    );
  }

  const [initialQueue, options, requested] = await Promise.all([
    getGradingQueue(classIds, filters),
    getGradingFilterOptions(classIds, filters),
    requestedId ? getGradingDetail(requestedId, classIds) : Promise.resolve(null),
  ]);
  // Bộ lọc trên URL phải khớp ô chọn: lớp / bài tập không tồn tại hoặc ngoài phạm vi
  // (không có trong options) bị bỏ, như ?class ngoài phạm vi ở trên. Bài tập không
  // thuộc lớp đang lọc cũng bỏ (giống khi đổi lớp trong ô lọc).
  const optAssignment = filters.assignmentId ? options.assignments.find((a) => a.id === filters.assignmentId) : undefined;
  const dropClass = !!filters.classId && !options.classes.some((c) => c.id === filters.classId);
  if (dropClass) filters.classId = null;
  const dropAssignment = !!filters.assignmentId && (!optAssignment || (!!filters.classId && optAssignment.classId !== filters.classId));
  if (dropAssignment) filters.assignmentId = null;
  const queue = dropClass || dropAssignment ? await getGradingQueue(classIds, filters) : initialQueue;
  // ?attempt ngoài phạm vi / không tồn tại → bỏ qua, chọn mặc định: bài chờ cũ nhất, rồi bài vừa chấm.
  const defaultId = queue.pending[0]?.id ?? queue.graded[0]?.id ?? null;
  const detail = requested ?? (defaultId ? await getGradingDetail(defaultId, classIds) : null);

  const hrefFor = (attemptId: string) => {
    const p = new URLSearchParams();
    if (filters.assignmentId) p.set("assignment", filters.assignmentId);
    if (filters.classId) p.set("class", filters.classId);
    p.set("attempt", attemptId);
    return `/admin/grading?${p.toString()}#bai-lam`;
  };

  return (
    <>
      {header}
      <AdminContent>
        {options.assignments.length > 0 && (
          <GradingFilters options={options} classId={filters.classId} assignmentId={filters.assignmentId} />
        )}
        <div className="grid grid-cols-1 items-start gap-5 min-[1100px]:grid-cols-[320px_minmax(0,1fr)]">
          {/* Dưới 1100px hàng chờ nằm trên chi tiết bài → giới hạn chiều cao để bài đang chấm không bị đẩy xuống quá xa. */}
          <GradingQueue
            pending={queue.pending}
            pendingTotal={queue.pendingTotal}
            graded={queue.graded}
            activeId={detail?.id ?? null}
            hrefFor={hrefFor}
            className="max-h-[45dvh] overflow-y-auto min-[1100px]:sticky min-[1100px]:top-[84px] min-[1100px]:max-h-[calc(100dvh-104px)]"
          />
          {detail ? (
            <DetailPanel detail={detail} filters={filters} canEditRubrics={canEditRubrics} isOwnAttempt={detail.student.id === user.id} />
          ) : (
            <section id="bai-lam" className="adm-panel min-w-0">
              <EmptyState>
                {queue.pending.length === 0 && queue.graded.length === 0
                  ? "Chưa có bài nộp nào cần giáo viên chấm."
                  : "Chọn một bài để chấm."}
              </EmptyState>
            </section>
          )}
        </div>
      </AdminContent>
    </>
  );
}

function DetailPanel({
  detail,
  filters,
  canEditRubrics,
  isOwnAttempt,
}: {
  detail: GradingDetail;
  filters: Filters;
  canEditRubrics: boolean;
  /** Bài của chính người đang xem (tài khoản nhiều vai trò) → không được tự chấm. */
  isOwnAttempt: boolean;
}) {
  const { rubric, saved } = detail;
  const rubricLabel = rubric ? (rubric.id === null ? "Rubric mặc định — chưa đối chiếu Pearson" : `Rubric phiên bản ${rubric.version}`) : "";

  return (
    <section id="bai-lam" className="adm-panel min-w-0 scroll-mt-24" aria-labelledby="grading-detail-title">
      <div className="adm-panel-head">
        <div className="min-w-0">
          <h2 id="grading-detail-title" className="break-words">
            {detail.type.name} — {detail.student.name}
          </h2>
          <p className="text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
            {detail.assignmentTitle}
            {detail.classCode && ` · lớp ${detail.classCode}`} · nộp{" "}
            <span className="adm-num">{formatVnDateTime(detail.submittedAt)}</span>
          </p>
        </div>
        {detail.reviewStatus === "GRADED" ? <Pill tone="ok">Đã trả bài</Pill> : <Pill tone="warn">Chờ chấm</Pill>}
      </div>

      <div className="flex flex-col gap-5 p-4">
        {/* Thông báo "đã lưu bài trước" do form chấm đặt trước khi tự chuyển sang bài này (không qua URL). */}
        <FlashNotice key={detail.id} flashKey={`grade:${detail.id}`} />

        <PersonCell name={detail.student.name} email={detail.student.email} extra={<span className="adm-tag">{detail.type.code}</span>} />

        <PromptBlock prompt={detail.prompt} questionCode={detail.questionCode} />
        <AnswerBlock answer={detail.answer} />
        <AiGradeBlock ai={detail.ai} />

        <div className="max-w-[640px] border-t pt-4" style={{ borderColor: "var(--adm-line)" }}>
          {isOwnAttempt ? (
            <p
              className="rounded-lg px-3 py-2 text-[13px]"
              style={{ background: "var(--adm-warn-soft)", color: "var(--adm-warn)" }}
            >
              Đây là bài làm của chính bạn nên bạn không thể tự chấm. Nhờ giáo viên khác hoặc Trưởng học thuật chấm bài này.
            </p>
          ) : rubric || saved ? (
            <>
              {!rubric && <NoRubricNote typeId={detail.type.id} typeCode={detail.type.code} canEditRubrics={canEditRubrics} />}
              <GradeForm
                key={detail.id}
                attemptId={detail.id}
                criteria={detail.criteria}
                rubricVersion={rubric?.version ?? 0}
                rubricLabel={rubricLabel}
                rubricSettingsHref={canEditRubrics ? "/admin/grading/rubrics" : undefined}
                saved={
                  saved
                    ? {
                        criteria: saved.criteria,
                        total: saved.total,
                        maxTotal: saved.maxTotal,
                        comment: saved.comment,
                        gradedAtText: formatVnDateTime(saved.gradedAt),
                        gradedAtIso: saved.gradedAt.toISOString(),
                        gradedByName: saved.gradedByName,
                        rubricVersion: saved.rubricVersion,
                      }
                    : null
                }
                filters={filters}
              />
            </>
          ) : (
            <NoRubricNote typeId={detail.type.id} typeCode={detail.type.code} canEditRubrics={canEditRubrics} />
          )}
        </div>
      </div>
    </section>
  );
}

function NoRubricNote({ typeId, typeCode, canEditRubrics }: { typeId: string; typeCode: string; canEditRubrics: boolean }) {
  return (
    <p
      className="mb-3 rounded-lg px-3 py-2 text-[13px]"
      style={{ background: "var(--adm-warn-soft)", color: "var(--adm-warn)" }}
    >
      Dạng bài {typeCode} chưa có rubric chấm nên chưa nhập điểm được.{" "}
      {canEditRubrics ? (
        <Link href={`/admin/grading/rubrics?add=${encodeURIComponent(typeId)}`} className="font-semibold underline underline-offset-2">
          Thêm rubric cho dạng bài này
        </Link>
      ) : (
        "Liên hệ Admin hoặc Trưởng học thuật để thêm rubric."
      )}
    </p>
  );
}
