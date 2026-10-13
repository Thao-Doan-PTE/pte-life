import { AdminContent, AdminPageHeader } from "@/components/admin/admin-ui";
import { QuestionImportForm } from "@/components/admin/question-import-form";
import { QuestionBulkList } from "@/components/admin/question-bulk-list";
import { QuestionTypeNav } from "@/components/admin/question-bank/question-type-nav";
import { UrlToggle } from "@/components/admin/question-bank/tu-only-toggle";
import { formatCount } from "@/components/admin/question-bank/bank-meta";
import { getQuestionCounts, getQuestionsForTypeAdmin } from "@/lib/actions/admin-questions";
import { can, requireAdminPage } from "@/lib/admin/permissions";
import { QUESTION_IMPORT_SCHEMAS } from "@/lib/question-import/schemas";

/** Ngân hàng đề — giữ đúng bố cục & luồng nhập của bản ban đầu: cột trái là 22
 * dạng (theo kỹ năng, kèm số câu), bên phải là dạng đang chọn: tải file mẫu,
 * lọc Tất cả / Luyện đề PTE / Luyện đề Tủ, ghi chú, form nhập file (chọn ngân
 * hàng PTE hoặc Tủ) và danh sách câu. Chỉ khác: nằm trong khung Admin, chỉ người
 * có quyền sửa mới thấy form nhập/xoá; câu đang nằm trong bài tập thì được ẩn
 * thay vì xoá (xem câu đã ẩn bằng ?archived=1). */
export default async function AdminQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; bank?: string; archived?: string }>;
}) {
  const user = await requireAdminPage("viewQuestionBank");
  const canEdit = can(user, "editQuestionBank");

  const counts = await getQuestionCounts();
  const navCounts = counts.filter((c) => Object.hasOwn(QUESTION_IMPORT_SCHEMAS, c.questionTypeId));
  const { type, bank, archived } = await searchParams;
  const selectedType =
    typeof type === "string" && Object.hasOwn(QUESTION_IMPORT_SCHEMAS, type) ? type : navCounts[0]?.questionTypeId;
  const selectedBank = bank === "PTE" || bank === "TU" ? bank : undefined;
  const showArchived = archived === "1";

  if (!selectedType) {
    return (
      <>
        <AdminPageHeader title="Ngân hàng đề" />
        <AdminContent>
          <p className="text-[13.5px]" style={{ color: "var(--adm-ink-3)" }}>
            Chưa có dạng câu hỏi nào.
          </p>
        </AdminContent>
      </>
    );
  }

  const schema = QUESTION_IMPORT_SCHEMAS[selectedType];
  const current = counts.find((c) => c.questionTypeId === selectedType);
  const questions = await getQuestionsForTypeAdmin(selectedType, selectedBank, showArchived);
  const typeHref = (b: "PTE" | "TU" | undefined, withArchived = showArchived) =>
    `/admin/questions?type=${selectedType}${b ? `&bank=${b}` : ""}${withArchived ? "&archived=1" : ""}`;
  const archivedCount =
    selectedBank === "TU"
      ? (current?.archivedTuCount ?? 0)
      : selectedBank === "PTE"
        ? (current?.archivedCount ?? 0) - (current?.archivedTuCount ?? 0)
        : (current?.archivedCount ?? 0);
  const shownArchived = questions.filter((q) => q.archivedAt).length;

  return (
    <>
      <AdminPageHeader
        title="Ngân hàng đề"
        sub={canEdit ? "Chọn 1 dạng câu hỏi để import hoặc quản lý." : "Chế độ chỉ xem."}
      />
      <AdminContent className="lg:grid lg:grid-cols-[256px_minmax(0,1fr)] lg:items-start">
        <QuestionTypeNav counts={navCounts} selectedType={selectedType} />

        <section className="adm-panel flex min-w-0 flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[17px] font-semibold">{current?.name ?? selectedType}</h2>
            {canEdit && (
              <a
                href={`/api/admin/questions/template?type=${selectedType}`}
                className="text-[13.5px] font-medium underline-offset-2 hover:underline"
                style={{ color: "var(--adm-brand-text)" }}
              >
                Tải file mẫu (.csv)
              </a>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <nav className="adm-seg" aria-label="Lọc theo ngân hàng đề">
              {(
                [
                  { value: undefined, label: "Tất cả" },
                  { value: "PTE", label: "Luyện đề PTE" },
                  { value: "TU", label: "Luyện đề Tủ" },
                ] as const
              ).map((opt) => (
                <a key={opt.label} href={typeHref(opt.value)} aria-current={selectedBank === opt.value ? "true" : undefined}>
                  {opt.label}
                </a>
              ))}
            </nav>
            {(showArchived || archivedCount > 0) && (
              <UrlToggle
                checked={showArchived}
                href={typeHref(selectedBank, !showArchived)}
                label={`Hiện câu đã ẩn (${formatCount(archivedCount)})`}
              />
            )}
          </div>

          {canEdit && schema.notes && (
            <p
              className="rounded-lg border p-3 text-[12.5px] leading-relaxed"
              style={{ background: "var(--adm-surface)", borderColor: "var(--adm-line)", color: "var(--adm-ink-2)" }}
            >
              {schema.notes}
            </p>
          )}

          {canEdit && <QuestionImportForm key={selectedType} questionTypeId={selectedType} />}

          <div className="flex flex-col gap-1">
            <p className="text-[13.5px] font-medium">
              {formatCount(questions.length - shownArchived)} câu trong ngân hàng đề
              {shownArchived > 0 ? ` · ${formatCount(shownArchived)} đã ẩn` : ""}
            </p>
            <QuestionBulkList
              key={`${selectedType}-${selectedBank ?? "all"}-${showArchived ? "archived" : "active"}`}
              questions={questions.map((q) => ({
                id: q.id,
                code: q.code,
                availableIn: q.availableIn,
                bank: q.bank,
                createdAt: q.createdAt.toISOString(),
                archivedAt: q.archivedAt?.toISOString() ?? null,
                inAssignments: q._count.assignmentItems > 0,
              }))}
              questionTypeId={selectedType}
              canEdit={canEdit}
            />
          </div>
        </section>
      </AdminContent>
    </>
  );
}
