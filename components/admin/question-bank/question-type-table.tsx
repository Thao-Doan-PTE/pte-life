import Link from "next/link";
import { Pill, ProgressBar, EmptyState } from "@/components/admin/admin-ui";
import {
  appliesToLabel,
  formatCount,
  gradingModeOf,
  GRADING_MODE_LABEL,
  GRADING_MODE_TONE,
  tuRatio,
} from "@/components/admin/question-bank/bank-meta";
import { SKILL_LABELS, type Skill } from "@/lib/question-types";
import type { QuestionTypeCount } from "@/lib/actions/admin-questions";

const SKILL_ORDER: Skill[] = ["speaking", "writing", "reading", "listening"];

/** Bảng dạng bài của Ngân hàng đề. Nút cuối dòng mở trang quản lý từng dạng
 * (?type=<id>: nhập file + danh sách câu) — giữ nguyên luồng nhập 22 dạng hiện có. */
export function QuestionTypeTable({
  counts,
  tuOnly,
  canEdit,
  importableIds,
}: {
  counts: QuestionTypeCount[];
  tuOnly: boolean;
  canEdit: boolean;
  /** Dạng có mẫu nhập file (QUESTION_IMPORT_SCHEMAS) — mới mở được trang quản lý. */
  importableIds: Set<string>;
}) {
  if (counts.length === 0) return <EmptyState>Không có dạng bài nào.</EmptyState>;

  const skills = SKILL_ORDER.filter((s) => counts.some((c) => c.skill === s));
  const grouped = skills.length > 1;

  return (
    <div className="adm-tw">
      <table className="adm-table min-w-[760px]">
        <thead>
          <tr>
            <th scope="col">Mã</th>
            <th scope="col">Dạng bài</th>
            <th scope="col">Áp dụng</th>
            <th scope="col" className="text-right">
              {tuOnly ? "Câu Tủ" : "Tổng câu"}
            </th>
            <th scope="col">Tỷ lệ Tủ</th>
            <th scope="col">Chấm</th>
            <th scope="col">
              <span className="sr-only">Hành động</span>
            </th>
          </tr>
        </thead>
        {skills.map((skill) => (
          <tbody key={skill}>
            {grouped && (
              <tr>
                <th
                  scope="rowgroup"
                  colSpan={7}
                  style={{ background: "var(--adm-bg)", color: "var(--adm-ink-2)", paddingTop: 12, paddingBottom: 6 }}
                >
                  {SKILL_LABELS[skill]}
                </th>
              </tr>
            )}
            {counts
              .filter((c) => c.skill === skill)
              .map((c) => {
                const mode = gradingModeOf({ id: c.questionTypeId, skill: c.skill });
                const ratio = tuRatio(c.count, c.tuCount);
                const importable = importableIds.has(c.questionTypeId);
                return (
                  <tr key={c.questionTypeId}>
                    <td>
                      <span className="adm-tag">{c.code}</span>
                    </td>
                    <td className="font-semibold">{c.name}</td>
                    <td className="whitespace-nowrap" style={{ color: "var(--adm-ink-2)" }}>
                      {appliesToLabel(c.availableIn)}
                    </td>
                    <td className="adm-num text-right font-semibold">
                      {formatCount(tuOnly ? c.tuCount : c.count)}
                    </td>
                    <td className="min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <span className="adm-num w-9 shrink-0 text-[12.5px]" style={{ color: "var(--adm-ink-2)" }}>
                          {Math.round(ratio)}%
                        </span>
                        <ProgressBar value={ratio} red />
                      </div>
                    </td>
                    <td>
                      <Pill tone={GRADING_MODE_TONE[mode]}>{GRADING_MODE_LABEL[mode]}</Pill>
                    </td>
                    <td className="text-right">
                      {importable ? (
                        <Link
                          href={`/admin/questions?type=${c.questionTypeId}`}
                          className="adm-btn adm-btn-sm adm-btn-ghost"
                          aria-label={`${canEdit ? "Nhập & quản lý câu" : "Xem câu"} dạng ${c.code} — ${c.name}`}
                        >
                          {canEdit ? "Nhập & quản lý" : "Xem câu"}
                        </Link>
                      ) : (
                        <span className="text-[12.5px] whitespace-nowrap" style={{ color: "var(--adm-ink-3)" }}>
                          Chưa có mẫu nhập
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        ))}
      </table>
    </div>
  );
}
