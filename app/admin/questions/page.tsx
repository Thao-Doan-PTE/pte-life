import Link from "next/link";
import { AdminContent, AdminPageHeader, Panel, SegLinks } from "@/components/admin/admin-ui";
import { QuestionImportForm } from "@/components/admin/question-import-form";
import { QuestionBulkList } from "@/components/admin/question-bulk-list";
import { BankSummaryCards } from "@/components/admin/question-bank/bank-summary-cards";
import { QuestionTypeTable } from "@/components/admin/question-bank/question-type-table";
import { QuestionTypeNav } from "@/components/admin/question-bank/question-type-nav";
import { TuOnlyToggle, UrlToggle } from "@/components/admin/question-bank/tu-only-toggle";
import {
  appliesToLabel,
  formatCount,
  gradingModeOf,
  GRADING_MODE_LABEL,
  parseSkillGroup,
  SKILL_GROUPS,
  skillGroupOf,
  type SkillGroup,
} from "@/components/admin/question-bank/bank-meta";
import { getQuestionCounts, getQuestionsForTypeAdmin, type QuestionTypeCount } from "@/lib/actions/admin-questions";
import { can, requireAdminPage } from "@/lib/admin/permissions";
import { QUESTION_IMPORT_SCHEMAS } from "@/lib/question-import/schemas";
import { SKILL_LABELS } from "@/lib/question-types";

/** Ngân hàng đề (HANDOFF §4.8). Không có ?type → trang tổng: 4 thẻ tổng + bảng
 * dạng bài. Có ?type=<id> → trang quản lý từng dạng (tải file mẫu, nhập file,
 * danh sách & xoá câu) — giữ nguyên luồng nhập theo từng dạng (22 dạng có mẫu).
 * Câu đã ẩn (archivedAt — câu đang nằm trong bài tập nên không xoá hẳn được) không
 * tính vào số câu; danh sách từng dạng chỉ hiện chúng khi bật ?archived=1. */
export default async function AdminQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; bank?: string; skill?: string; tu?: string; archived?: string }>;
}) {
  const user = await requireAdminPage("viewQuestionBank");
  const canEdit = can(user, "editQuestionBank");

  const counts = await getQuestionCounts();
  const { type, bank, skill, tu, archived } = await searchParams;
  const selectedType = type && Object.hasOwn(QUESTION_IMPORT_SCHEMAS, type) ? type : null;

  if (selectedType) {
    const selectedBank = bank === "PTE" || bank === "TU" ? bank : undefined;
    return (
      <QuestionTypeManager
        counts={counts}
        selectedType={selectedType}
        selectedBank={selectedBank}
        showArchived={archived === "1"}
        canEdit={canEdit}
      />
    );
  }

  return <QuestionBankOverview counts={counts} group={parseSkillGroup(skill)} tuOnly={tu === "1"} canEdit={canEdit} />;
}

function overviewHref(group: SkillGroup | null, tuOnly: boolean): string {
  const params = new URLSearchParams();
  if (group) params.set("skill", group);
  if (tuOnly) params.set("tu", "1");
  const qs = params.toString();
  return qs ? `/admin/questions?${qs}` : "/admin/questions";
}

function QuestionBankOverview({
  counts,
  group,
  tuOnly,
  canEdit,
}: {
  counts: QuestionTypeCount[];
  group: SkillGroup | null;
  tuOnly: boolean;
  canEdit: boolean;
}) {
  const total = counts.reduce((sum, c) => sum + c.count, 0);
  const archivedTotal = counts.reduce((sum, c) => sum + c.archivedCount, 0);
  const rows = group ? counts.filter((c) => skillGroupOf(c.skill) === group) : counts;
  const rowsTotal = rows.reduce((sum, c) => sum + (tuOnly ? c.tuCount : c.count), 0);
  const groupLabel = group ? SKILL_GROUPS.find((g) => g.key === group)?.label : null;
  const importableIds = new Set(Object.keys(QUESTION_IMPORT_SCHEMAS));

  return (
    <>
      <AdminPageHeader
        title="Ngân hàng đề"
        sub={`${formatCount(total)} câu · ${counts.length} dạng bài${
          archivedTotal > 0 ? ` · ${formatCount(archivedTotal)} câu đã ẩn` : ""
        }${canEdit ? "" : " · chế độ chỉ xem"}`}
      />
      <AdminContent>
        <BankSummaryCards counts={counts} activeGroup={group} hrefForGroup={(g) => overviewHref(g, tuOnly)} />

        <Panel
          title={groupLabel ?? "Tất cả dạng bài"}
          meta={`${rows.length} dạng · ${formatCount(rowsTotal)} ${tuOnly ? "câu Tủ" : "câu"}`}
          actions={
            <>
              {group && (
                <Link href={overviewHref(null, tuOnly)} scroll={false} className="adm-btn adm-btn-sm adm-btn-ghost">
                  Bỏ lọc
                </Link>
              )}
              <TuOnlyToggle checked={tuOnly} href={overviewHref(group, !tuOnly)} />
            </>
          }
        >
          {canEdit && (
            <p
              className="border-b px-4 py-2.5 text-[12.5px]"
              style={{ borderColor: "var(--adm-line)", color: "var(--adm-ink-3)" }}
            >
              Bấm “Nhập & quản lý” ở từng dạng để tải file mẫu (.csv), nhập file câu hỏi hoặc xoá câu.
            </p>
          )}
          <QuestionTypeTable counts={rows} tuOnly={tuOnly} canEdit={canEdit} importableIds={importableIds} />
        </Panel>
      </AdminContent>
    </>
  );
}

async function QuestionTypeManager({
  counts,
  selectedType,
  selectedBank,
  showArchived,
  canEdit,
}: {
  counts: QuestionTypeCount[];
  selectedType: string;
  selectedBank: "PTE" | "TU" | undefined;
  showArchived: boolean;
  canEdit: boolean;
}) {
  const schema = QUESTION_IMPORT_SCHEMAS[selectedType];
  const current = counts.find((c) => c.questionTypeId === selectedType);
  const questions = await getQuestionsForTypeAdmin(selectedType, selectedBank, showArchived);
  const navCounts = counts.filter((c) => Object.hasOwn(QUESTION_IMPORT_SCHEMAS, c.questionTypeId));
  const mode = current ? gradingModeOf({ id: current.questionTypeId, skill: current.skill }) : null;
  const typeHref = (b: "PTE" | "TU" | undefined, withArchived = showArchived) =>
    `/admin/questions?type=${selectedType}${b ? `&bank=${b}` : ""}${withArchived ? "&archived=1" : ""}`;

  // Số câu theo ngân hàng; khi đang hiện câu đã ẩn thì cộng cả câu đã ẩn cho khớp danh sách.
  const active = { all: current?.count ?? 0, tu: current?.tuCount ?? 0 };
  const archived = { all: current?.archivedCount ?? 0, tu: current?.archivedTuCount ?? 0 };
  const bankCount = (b: "PTE" | "TU" | undefined, c: { all: number; tu: number }) =>
    b === "TU" ? c.tu : b === "PTE" ? c.all - c.tu : c.all;
  const segCount = (b: "PTE" | "TU" | undefined) => bankCount(b, active) + (showArchived ? bankCount(b, archived) : 0);
  const archivedInBank = bankCount(selectedBank, archived);
  const shownArchived = questions.filter((q) => q.archivedAt).length;
  const shownActive = questions.length - shownArchived;

  const sub = current
    ? [
        current.code,
        SKILL_LABELS[current.skill],
        `Áp dụng: ${appliesToLabel(current.availableIn)}`,
        mode ? `Chấm: ${GRADING_MODE_LABEL[mode]}` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : undefined;

  return (
    <>
      <AdminPageHeader
        title={current?.name ?? "Ngân hàng đề"}
        sub={sub}
        actions={
          <Link href="/admin/questions" className="adm-btn adm-btn-sm" aria-label="Về bảng tất cả dạng bài">
            ← <span className="hidden sm:inline">Tất cả dạng bài</span>
          </Link>
        }
      />
      <AdminContent className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
        <QuestionTypeNav counts={navCounts} selectedType={selectedType} />

        <div className="flex min-w-0 flex-col gap-5">
          {canEdit && (
            <Panel
              title="Nhập câu hỏi từ file"
              actions={
                <a href={`/api/admin/questions/template?type=${selectedType}`} className="adm-btn adm-btn-sm">
                  Tải file mẫu (.csv)
                </a>
              }
              bodyClassName="flex flex-col gap-3 p-4"
            >
              {schema.notes && (
                <p
                  className="rounded-lg border px-3 py-2 text-[12.5px] leading-relaxed"
                  style={{ background: "var(--adm-surface)", borderColor: "var(--adm-line)", color: "var(--adm-ink-2)" }}
                >
                  {schema.notes}
                </p>
              )}
              <QuestionImportForm key={selectedType} questionTypeId={selectedType} />
            </Panel>
          )}

          <Panel
            title="Câu trong ngân hàng đề"
            meta={`${formatCount(shownActive)} câu${
              showArchived ? ` · ${formatCount(shownArchived)} đã ẩn` : ""
            }${canEdit ? "" : " · chỉ xem"}`}
            actions={
              <>
                <SegLinks
                  items={[
                    { label: `Tất cả (${formatCount(segCount(undefined))})`, href: typeHref(undefined), active: !selectedBank },
                    {
                      label: `Luyện đề PTE (${formatCount(segCount("PTE"))})`,
                      href: typeHref("PTE"),
                      active: selectedBank === "PTE",
                    },
                    {
                      label: `Luyện đề Tủ (${formatCount(segCount("TU"))})`,
                      href: typeHref("TU"),
                      active: selectedBank === "TU",
                    },
                  ]}
                />
                {(showArchived || archived.all > 0) && (
                  <UrlToggle
                    checked={showArchived}
                    href={typeHref(selectedBank, !showArchived)}
                    label={`Hiện câu đã ẩn (${formatCount(archivedInBank)})`}
                  />
                )}
              </>
            }
          >
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
          </Panel>
        </div>
      </AdminContent>
    </>
  );
}
