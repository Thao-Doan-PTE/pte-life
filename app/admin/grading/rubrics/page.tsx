import Link from "next/link";
import { AdminContent, AdminPageHeader, Panel } from "@/components/admin/admin-ui";
import { RubricEditor } from "@/components/admin/grading/rubric-editor";
import { requireAdminPage } from "@/lib/admin/permissions";
import { findQuestionType, getRubricOverview } from "@/lib/admin/grading-queries";
import { formatVnDate } from "@/lib/admin/student-status";
import { SKILL_LABELS } from "@/lib/question-types";

/** Cài đặt rubric chấm (quyết định 13): rubric lưu trong DB theo phiên bản, sửa
 * được không cần lập trình. Bản mặc định lấy theo HANDOFF — chưa đối chiếu Pearson.
 * Chỉ Admin / Trưởng học thuật (editRubrics); server action kiểm tra lại quyền. */
export default async function AdminRubricsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireAdminPage("editRubrics");
  const sp = await searchParams;
  const addParam = Array.isArray(sp.add) ? sp.add[0] : sp.add;

  const overview = await getRubricOverview();
  const addType = addParam ? overview.addableTypes.find((t) => t.id === addParam) : undefined;
  const addSkill = addType ? findQuestionType(addType.id)?.skill : undefined;

  return (
    <>
      <AdminPageHeader
        title="Rubric chấm bài"
        sub="Tiêu chí và điểm tối đa theo dạng bài · mỗi lần lưu tạo phiên bản mới"
        actions={
          <Link href="/admin/grading" className="adm-btn adm-btn-sm">
            ← Chấm bài
          </Link>
        }
      />
      <AdminContent>
        <p
          className="rounded-[10px] px-4 py-3 text-[13px] leading-relaxed"
          style={{ background: "var(--adm-warn-soft)", color: "var(--adm-warn)" }}
        >
          Bản mặc định lấy theo tài liệu bàn giao, <b>chưa đối chiếu rubric Pearson hiện hành</b> — đội chuyên môn cần rà
          soát trước khi dùng chính thức. Chỉ dạng bài có rubric mới vào hàng chờ giáo viên chấm (khi học viên nộp bài
          trong bài tập được giao). Bài đã chấm giữ nguyên bản chụp rubric lúc chấm.
        </p>

        {overview.addableTypes.length > 0 && (
          <Panel title="Thêm rubric cho dạng bài khác" bodyClassName="p-4">
            <form method="get" action="/admin/grading/rubrics" className="flex flex-wrap items-end gap-2">
              <div className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-[360px]">
                <label htmlFor="rubric-add-type" className="text-[12px] font-semibold" style={{ color: "var(--adm-ink-2)" }}>
                  Dạng bài Speaking / Writing chưa có rubric
                </label>
                <select id="rubric-add-type" name="add" className="adm-input w-full" defaultValue={addType?.id ?? ""} required>
                  <option value="" disabled>
                    Chọn dạng bài…
                  </option>
                  {overview.addableTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {`${t.code} — ${t.name}`}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="adm-btn">
                Thêm rubric
              </button>
            </form>
          </Panel>
        )}

        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
          {addType && (
            <RubricEditor
              key={`new-${addType.id}`}
              questionTypeId={addType.id}
              code={addType.code}
              name={addType.name}
              skillLabel={addSkill ? SKILL_LABELS[addSkill] : ""}
              criteria={[]}
              version={0}
              note={null}
              isDefault={false}
              metaText="Dạng bài mới — chưa có rubric. Thêm tiêu chí rồi lưu để tạo phiên bản 1."
              isNew
            />
          )}
          {overview.rows.map((row) => (
            <RubricEditor
              key={row.questionTypeId}
              questionTypeId={row.questionTypeId}
              code={row.code}
              name={row.name}
              skillLabel={SKILL_LABELS[row.skill]}
              criteria={row.rubric.criteria}
              version={row.rubric.version}
              note={row.rubric.note}
              isDefault={row.isDefault}
              metaText={
                row.isDefault
                  ? "Bản mặc định (chưa lưu phiên bản nào)"
                  : `Phiên bản ${row.rubric.version}${row.updatedAt ? ` · lưu ngày ${formatVnDate(row.updatedAt)}` : ""}${
                      row.updatedByName ? ` · bởi ${row.updatedByName}` : ""
                    }`
              }
            />
          ))}
        </div>
      </AdminContent>
    </>
  );
}
